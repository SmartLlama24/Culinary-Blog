import {
  supabase,
  supabaseConfigError,
  supabaseProjectHost,
} from './supabaseClient.js'

const recipeSelection = `
  id,
  slug,
  title,
  excerpt,
  category,
  cover_image_path,
  cover_image_alt,
  prep_time_minutes,
  cook_time_minutes,
  servings,
  status,
  published_at,
  created_at,
  updated_at,
  recipe_ingredients (
    id,
    ingredient_name,
    quantity,
    unit,
    notes,
    sort_order
  ),
  recipe_instructions (
    id,
    instruction,
    step_number
  )
`

const postSelection = `
  id,
  slug,
  title,
  excerpt,
  category,
  body,
  cover_image_path,
  cover_image_alt,
  status,
  published_at,
  created_at,
  updated_at
`

export const COVER_BUCKET = 'culinary-covers'
export const MAX_COVER_BYTES = 5 * 1024 * 1024
export const ALLOWED_COVER_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]

function requireSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigError)
  }

  return supabase
}

function logContentError(operation, error, context = {}) {
  if (!import.meta.env.DEV) return

  console.error(`[content] ${operation} failed`, {
    ...context,
    name: error?.name,
    message: error?.message,
    code: error?.code,
    status: error?.status,
    statusCode: error?.statusCode,
  })
}

function isMissingStorageObject(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return (
    error?.status === 404 ||
    error?.statusCode === '404' ||
    error?.code === 'NoSuchKey' ||
    message.includes('object not found')
  )
}

function sortRecipeChildren(recipe) {
  return {
    ...recipe,
    recipe_ingredients: [...(recipe.recipe_ingredients ?? [])].sort(
      (first, second) => first.sort_order - second.sort_order,
    ),
    recipe_instructions: [...(recipe.recipe_instructions ?? [])].sort(
      (first, second) => first.step_number - second.step_number,
    ),
  }
}

async function addSignedCoverUrl(item) {
  if (!item.cover_image_path) {
    return { ...item, cover_image_url: null }
  }

  try {
    const { data, error } = await requireSupabase()
      .storage.from(COVER_BUCKET)
      .createSignedUrl(item.cover_image_path, 60 * 60)

    if (error) throw error

    return { ...item, cover_image_url: data.signedUrl }
  } catch (error) {
    logContentError('create cover signed URL', error, {
      bucket: COVER_BUCKET,
      contentType: item.content_type ?? 'recipe',
    })
    if (isMissingStorageObject(error)) {
      return { ...item, cover_image_url: null }
    }
    throw error
  }
}

async function signCovers(items) {
  return Promise.all(items.map(addSignedCoverUrl))
}

export async function getPublishedFeed() {
  const client = requireSupabase()
  const [recipeResult, postResult] = await Promise.all([
    client
      .from('recipes')
      .select(recipeSelection)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false }),
    client
      .from('blog_posts')
      .select(postSelection)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false }),
  ])

  if (recipeResult.error) throw recipeResult.error
  if (postResult.error) throw postResult.error

  const recipes = (recipeResult.data ?? []).map((recipe) => ({
    ...sortRecipeChildren(recipe),
    content_type: 'recipe',
    publication_date: recipe.published_at,
  }))
  const posts = (postResult.data ?? []).map((post) => ({
    ...post,
    content_type: 'blog',
    publication_date: post.published_at,
  }))

  return signCovers(
    [...recipes, ...posts].sort(
      (first, second) =>
        new Date(second.publication_date).getTime() -
        new Date(first.publication_date).getTime(),
    ),
  )
}

export async function getPublishedRecipes() {
  const { data, error } = await requireSupabase()
    .from('recipes')
    .select(recipeSelection)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })

  if (error) throw error

  return signCovers(
    (data ?? []).map((recipe) => ({
      ...sortRecipeChildren(recipe),
      publication_date: recipe.published_at,
    })),
  )
}

export async function getPublishedRecipe(slug) {
  const { data, error } = await requireSupabase()
    .from('recipes')
    .select(recipeSelection)
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data
    ? addSignedCoverUrl({
        ...sortRecipeChildren(data),
      })
    : null
}

export async function getPublishedPosts() {
  const { data, error } = await requireSupabase()
    .from('blog_posts')
    .select(postSelection)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })

  if (error) throw error
  return signCovers(
    (data ?? []).map((post) => ({
      ...post,
      publication_date: post.published_at,
    })),
  )
}

export async function getPublishedPost(slug) {
  const { data, error } = await requireSupabase()
    .from('blog_posts')
    .select(postSelection)
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data ? addSignedCoverUrl(data) : null
}

export async function getAdminContent() {
  const client = requireSupabase()
  const [recipeResult, postResult] = await Promise.all([
    client.from('recipes').select(recipeSelection).order('updated_at', {
      ascending: false,
    }),
    client.from('blog_posts').select(postSelection).order('updated_at', {
      ascending: false,
    }),
  ])

  if (recipeResult.error) throw recipeResult.error
  if (postResult.error) throw postResult.error

  const recipes = (recipeResult.data ?? []).map((recipe) => ({
    ...sortRecipeChildren(recipe),
    content_type: 'recipe',
  }))
  const posts = (postResult.data ?? []).map((post) => ({
    ...post,
    content_type: 'blog',
  }))

  return signCovers([...recipes, ...posts])
}

export async function saveRecipe(recipe, existingId) {
  const client = requireSupabase()
  const values = {
    slug: recipe.slug,
    title: recipe.title,
    excerpt: recipe.excerpt,
    category: recipe.category,
    cover_image_path: recipe.cover_image_path,
    cover_image_alt: recipe.cover_image_alt,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    servings: recipe.servings,
    status: recipe.status,
  }
  const query = existingId
    ? client.from('recipes').update(values).eq('id', existingId)
    : client.from('recipes').insert({ id: recipe.id, ...values })
  const { data, error } = await query.select('id').single()

  if (error) throw error

  const recipeId = data.id
  const [ingredientDelete, instructionDelete] = await Promise.all([
    client.from('recipe_ingredients').delete().eq('recipe_id', recipeId),
    client.from('recipe_instructions').delete().eq('recipe_id', recipeId),
  ])

  if (ingredientDelete.error) throw ingredientDelete.error
  if (instructionDelete.error) throw instructionDelete.error

  const ingredients = recipe.ingredients.map((ingredient, index) => ({
    recipe_id: recipeId,
    ingredient_name: ingredient.name,
    quantity: ingredient.quantity || null,
    unit: ingredient.unit || null,
    notes: ingredient.notes || null,
    sort_order: index + 1,
  }))
  const instructions = recipe.instructions.map((instruction, index) => ({
    recipe_id: recipeId,
    instruction,
    step_number: index + 1,
  }))

  if (ingredients.length > 0) {
    const { error: ingredientError } = await client
      .from('recipe_ingredients')
      .insert(ingredients)
    if (ingredientError) throw ingredientError
  }

  if (instructions.length > 0) {
    const { error: instructionError } = await client
      .from('recipe_instructions')
      .insert(instructions)
    if (instructionError) throw instructionError
  }

  return recipeId
}

export async function saveBlogPost(post, existingId) {
  const values = {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    body: post.body,
    cover_image_path: post.cover_image_path,
    cover_image_alt: post.cover_image_alt,
    status: post.status,
  }
  const query = existingId
    ? requireSupabase().from('blog_posts').update(values).eq('id', existingId)
    : requireSupabase().from('blog_posts').insert(values)
  const { data, error } = await query.select('id').single()

  if (error) throw error
  return data.id
}

export async function deleteContent(type, id) {
  const table = type === 'recipe' ? 'recipes' : 'blog_posts'
  const { data, error } = await requireSupabase()
    .from(table)
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Content was not found or could not be deleted.')
}

export async function setContentStatus(type, id, status) {
  const table = type === 'recipe' ? 'recipes' : 'blog_posts'
  const { data, error } = await requireSupabase()
    .from(table)
    .update({ status })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Content was not found or could not be updated.')
}

export async function uploadCoverImage(type, contentId, file) {
  await validateCoverImage(file)

  const extensionByType = {
    'image/avif': 'avif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const path = `${type === 'recipe' ? 'recipes' : 'blog'}/${contentId}/${crypto.randomUUID()}.${extensionByType[file.type]}`

  if (import.meta.env.DEV) {
    console.info('[content] starting Storage upload', {
      bucket: COVER_BUCKET,
      contentType: type,
      projectHost: supabaseProjectHost,
      pathPrefix: type === 'recipe' ? 'recipes/' : 'blog/',
      mimeType: file.type,
      sizeBytes: file.size,
    })
  }

  try {
    const { data, error } = await requireSupabase()
      .storage.from(COVER_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (error) throw error
    if (!data) {
      throw new Error('Supabase Storage returned no upload data.')
    }
    if (data.path !== path) {
      throw new Error('Supabase Storage did not confirm the uploaded object path.')
    }

    if (import.meta.env.DEV) {
      console.info('[content] Storage upload confirmed', {
        bucket: COVER_BUCKET,
        projectHost: supabaseProjectHost,
        path: data.path,
        fullPath: data.fullPath ?? null,
      })
    }
    return data.path
  } catch (error) {
    logContentError('upload cover image', error, {
      bucket: COVER_BUCKET,
      contentType: type,
      httpStatus: error?.status,
      storageStatusCode: error?.statusCode,
    })

    const errorCode = error?.code ?? error?.statusCode
    const permissionHint =
      error?.status === 401 ||
      error?.status === 403 ||
      errorCode === '42501'
        ? ' Check that you are signed in as an admin and that the culinary-covers Storage upload policies are applied.'
        : ''
    const uploadError = new Error(
      `Cover image upload failed${error?.message ? `: ${error.message}` : '.'}${permissionHint}`,
      { cause: error },
    )
    uploadError.code = errorCode
    uploadError.status = error?.status
    uploadError.statusCode = error?.statusCode
    throw uploadError
  }
}

export async function deleteCoverImage(path) {
  if (!path) return

  const { error } = await requireSupabase()
    .storage.from(COVER_BUCKET)
    .remove([path])

  if (error) throw error
}

export async function deleteCoverImageIfUnreferenced(type, contentId, path) {
  const table = type === 'recipe' ? 'recipes' : 'blog_posts'
  const { data, error } = await requireSupabase()
    .from(table)
    .select('id')
    .eq('id', contentId)
    .eq('cover_image_path', path)
    .maybeSingle()

  if (error) throw error
  if (data) return false

  await deleteCoverImage(path)
  return true
}

export async function validateCoverImage(file) {
  if (!file) return
  if (!ALLOWED_COVER_TYPES.includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, WebP, or AVIF image.')
  }
  if (file.size > MAX_COVER_BYTES) {
    throw new Error('Cover images must be 5 MB or smaller.')
  }

  try {
    const decodedImage = await createImageBitmap(file)
    decodedImage.close()
  } catch {
    throw new Error('The selected file is not a valid image.')
  }
}

export function createSlug(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function formatContentDate(value) {
  if (!value) return 'Not published'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not published'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatRecipeTime(minutes) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`
}
