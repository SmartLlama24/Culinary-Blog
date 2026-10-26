import { useEffect, useMemo, useRef, useState } from 'react'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { useAdminContent } from '../hooks/useContent.js'
import {
  createSlug,
  deleteContent,
  deleteCoverImage,
  deleteCoverImageIfUnreferenced,
  formatContentDate,
  saveBlogPost,
  saveRecipe,
  setContentStatus,
  uploadCoverImage,
} from '../lib/content.js'

function createEmptyIngredient() {
  return {
    id: crypto.randomUUID(),
    name: '',
    quantity: '',
    unit: '',
    notes: '',
  }
}

function createEmptyForm(type = 'recipe') {
  return {
    title: '',
    slug: '',
    excerpt: '',
    category: '',
    cover_image_alt: '',
    prep_time_minutes: '0',
    cook_time_minutes: '0',
    servings: '2',
    ingredients: type === 'recipe' ? [createEmptyIngredient()] : [],
    instructions: '',
    body: '',
  }
}

function splitLines(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function validateIngredients(ingredients) {
  const errors = {}

  ingredients.forEach((ingredient) => {
    const ingredientErrors = {}
    const quantityText = ingredient.quantity.trim()
    const quantity = Number(quantityText)

    if (!ingredient.name.trim()) {
      ingredientErrors.name = 'Enter an ingredient name.'
    }

    if (!quantityText) {
      ingredientErrors.quantity = 'Enter a quantity greater than zero.'
    } else if (!/^\d+(?:\.\d{1,3})?$/.test(quantityText)) {
      ingredientErrors.quantity = 'Enter a number with up to 3 decimal places.'
    } else if (!Number.isFinite(quantity) || quantity <= 0) {
      ingredientErrors.quantity = 'Quantity must be greater than zero.'
    } else if (quantity > 9999999.999) {
      ingredientErrors.quantity = 'Quantity is too large.'
    }

    if (!ingredient.unit.trim()) {
      ingredientErrors.unit = 'Enter a unit.'
    }

    if (Object.keys(ingredientErrors).length > 0) {
      errors[ingredient.id] = ingredientErrors
    }
  })

  if (ingredients.length === 0) {
    errors.form = 'Add at least one ingredient.'
  }

  return errors
}

function recipeFormContent(item) {
  return {
    ...createEmptyForm('recipe'),
    ...item,
    prep_time_minutes: String(item.prep_time_minutes),
    cook_time_minutes: String(item.cook_time_minutes),
    servings: String(item.servings),
    ingredients: item.recipe_ingredients
      .map((ingredient) =>
        ({
          id: ingredient.id,
          name: ingredient.ingredient_name,
          quantity:
            ingredient.quantity === null ? '' : String(ingredient.quantity),
          unit: ingredient.unit ?? '',
          notes: ingredient.notes ?? '',
        })),
    instructions: item.recipe_instructions
      .map((step) => step.instruction)
      .join('\n'),
  }
}

function postFormContent(item) {
  return { ...createEmptyForm('blog'), ...item }
}

function Preview({ type, form, imageUrl }) {
  const isRecipe = type === 'recipe'

  return (
    <article className="admin-preview">
      <span className="eyebrow">{form.category || 'Preview'}</span>
      <h2>{form.title || 'Untitled content'}</h2>
      <p className="detail-lede">
        {form.excerpt || 'A short description will appear here.'}
      </p>
      {imageUrl && (
        <img
          alt={form.cover_image_alt || form.title || ''}
          className="admin-preview-image"
          src={imageUrl}
        />
      )}
      {isRecipe ? (
        <>
          <p className="card-meta">
            Prep {form.prep_time_minutes || 0} min · Cook{' '}
            {form.cook_time_minutes || 0} min · Serves {form.servings || 0}
          </p>
          <h3>Ingredients</h3>
          <ul>
            {form.ingredients
              .filter((ingredient) => ingredient.name || ingredient.quantity || ingredient.unit)
              .map((ingredient) => (
                <li key={ingredient.id}>
                  {[
                    ingredient.name,
                    ingredient.quantity,
                    ingredient.unit,
                    ingredient.notes,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </li>
              ))}
          </ul>
          <h3>Instructions</h3>
          <ol>
            {splitLines(form.instructions).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </>
      ) : (
        <div className="article-body">
          {form.body
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={`${index}-${paragraph}`}>{paragraph}</p>
            ))}
        </div>
      )}
    </article>
  )
}

export default function AdminPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data: items, error: loadError, isLoading } =
    useAdminContent(reloadKey)
  const [contentType, setContentType] = useState('recipe')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(() => createEmptyForm())
  const [ingredientErrors, setIngredientErrors] = useState({})
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [busyItemId, setBusyItemId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const previewUrlRef = useRef(null)
  const content = items ?? []
  const imageUrl = useMemo(
    () => filePreviewUrl || editingItem?.cover_image_url || '',
    [editingItem, filePreviewUrl],
  )

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  function setCoverFile(file) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = file ? URL.createObjectURL(file) : null
    setFilePreviewUrl(previewUrlRef.current ?? '')
    setSelectedFile(file)
  }

  function startNew(type) {
    setContentType(type)
    setEditingItem(null)
    setForm(createEmptyForm(type))
    setIngredientErrors({})
    setCoverFile(null)
    setIsEditorOpen(true)
    setIsPreviewing(false)
    setDeleteTarget(null)
    setErrorMessage('')
    setNotice('')
  }

  function startEditing(item) {
    setContentType(item.content_type)
    setEditingItem(item)
    setForm(
      item.content_type === 'recipe'
        ? recipeFormContent(item)
        : postFormContent(item),
    )
    setIngredientErrors({})
    setCoverFile(null)
    setIsEditorOpen(true)
    setIsPreviewing(false)
    setDeleteTarget(null)
    setErrorMessage('')
    setNotice('')
  }

  function updateField(field, value) {
    setForm((current) => {
      if (field === 'title') {
        const previousAutoSlug = createSlug(current.title)
        return {
          ...current,
          title: value,
          slug:
            !current.slug || current.slug === previousAutoSlug
              ? createSlug(value)
              : current.slug,
        }
      }
      return { ...current, [field]: value }
    })
  }

  function updateIngredient(ingredientId, field, value) {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient) =>
        ingredient.id === ingredientId
          ? { ...ingredient, [field]: value }
          : ingredient,
      ),
    }))
    setIngredientErrors((current) => {
      const currentErrors = current[ingredientId]
      if (!currentErrors?.[field]) return current
      const nextErrors = { ...currentErrors }
      delete nextErrors[field]
      const errors = { ...current }
      if (Object.keys(nextErrors).length > 0) {
        errors[ingredientId] = nextErrors
      } else {
        delete errors[ingredientId]
      }
      return errors
    })
  }

  function addIngredient() {
    setForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, createEmptyIngredient()],
    }))
    setIngredientErrors((current) => {
      const { form: _formError, ...errors } = current
      return errors
    })
  }

  function removeIngredient(ingredientId) {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.filter(
        (ingredient) => ingredient.id !== ingredientId,
      ),
    }))
    setIngredientErrors((current) => {
      const errors = { ...current }
      delete errors[ingredientId]
      return errors
    })
  }

  function refreshContent() {
    setReloadKey((current) => current + 1)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setNotice('')

    let uploadedPath = null
    let contentId = null
    const previousPath = editingItem?.cover_image_path ?? null
    const submitStatus = event.nativeEvent.submitter?.value ?? editingItem?.status ?? 'draft'
    let saveNotice = 'Content saved successfully.'

    try {
      if (contentType === 'recipe') {
        const errors = validateIngredients(form.ingredients)
        setIngredientErrors(errors)
        if (Object.keys(errors).length > 0) {
          setErrorMessage('Fix the ingredient fields marked below.')
          return
        }
      }

      if (!event.currentTarget.reportValidity()) return

      setIsSaving(true)
      const slug = createSlug(form.slug)
      if (!slug) throw new Error('Enter a title or URL slug.')

      contentId = editingItem?.id ?? crypto.randomUUID()
      let coverPath = previousPath

      if (selectedFile) {
        uploadedPath = await uploadCoverImage(
          contentType,
          contentId,
          selectedFile,
        )
        coverPath = uploadedPath
      }

      if (contentType === 'recipe') {
        const ingredients = form.ingredients.map((ingredient) => ({
          name: ingredient.name.trim(),
          quantity: Number(ingredient.quantity),
          unit: ingredient.unit.trim(),
          notes: ingredient.notes.trim(),
        }))
        const instructions = splitLines(form.instructions)

        if (submitStatus === 'published' && instructions.length === 0) {
          throw new Error(
            'Add at least one instruction before publishing.',
          )
        }

        await saveRecipe(
          {
            id: contentId,
            ...form,
            slug,
            cover_image_path: coverPath,
            status: submitStatus,
            prep_time_minutes: Number(form.prep_time_minutes),
            cook_time_minutes: Number(form.cook_time_minutes),
            servings: Number(form.servings),
            ingredients,
            instructions,
          },
          editingItem?.id,
        )
      } else {
        if (submitStatus === 'published' && !form.body.trim()) {
          throw new Error('Add the story text before publishing.')
        }

        await saveBlogPost(
          {
            ...form,
            slug,
            cover_image_path: coverPath,
            status: submitStatus,
          },
          editingItem?.id,
        )
      }

      if (previousPath && previousPath !== coverPath) {
        try {
          await deleteCoverImage(previousPath)
        } catch (cleanupError) {
          saveNotice = `Content saved, but the previous cover image could not be removed: ${cleanupError.message}`
        }
      }

      setEditingItem(null)
      setForm(createEmptyForm(contentType))
      setIngredientErrors({})
      setCoverFile(null)
      setIsEditorOpen(false)
      setIsPreviewing(false)
      setNotice(saveNotice)
      await refreshContent()
    } catch (error) {
      let message = error.message || 'Unable to save content.'

      if (uploadedPath && contentId) {
        try {
          const wasDeleted = await deleteCoverImageIfUnreferenced(
            contentType,
            contentId,
            uploadedPath,
          )
          if (!wasDeleted) {
            message +=
              ' The content record was saved and still references this uploaded image; keep it in Storage and retry saving the content details.'
          }
        } catch (cleanupError) {
          message += ` The new image also could not be removed: ${cleanupError.message}`
        }
      }

      setErrorMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(item) {
    setErrorMessage('')
    setNotice('')
    setBusyItemId(item.id)

    try {
      const status = item.status === 'published' ? 'draft' : 'published'
      if (status === 'published' && item.content_type === 'recipe') {
        if (
          item.recipe_ingredients.length === 0 ||
          item.recipe_instructions.length === 0
        ) {
          throw new Error(
            'Add at least one ingredient and instruction before publishing.',
          )
        }
      }
      if (status === 'published' && item.content_type === 'blog' && !item.body.trim()) {
        throw new Error('Add the story text before publishing.')
      }

      await setContentStatus(item.content_type, item.id, status)
      setNotice(
        status === 'published'
          ? 'Content published.'
          : 'Content unpublished and hidden from public readers.',
      )
      await refreshContent()
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update publication status.')
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleDelete(item) {
    setErrorMessage('')
    setNotice('')
    setBusyItemId(item.id)

    try {
      await deleteContent(item.content_type, item.id)
      setDeleteTarget(null)
      if (editingItem?.id === item.id) setEditingItem(null)
      await refreshContent()

      if (item.cover_image_path) {
        try {
          await deleteCoverImage(item.cover_image_path)
          setNotice('Content and cover image deleted.')
        } catch (cleanupError) {
          setErrorMessage(
            `Content was deleted, but its cover image could not be removed: ${cleanupError.message}`,
          )
        }
      } else {
        setNotice('Content deleted.')
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete content.')
    } finally {
      setBusyItemId(null)
    }
  }

  if (isLoading) {
    return <LoadingState label="Opening the kitchen studio…" />
  }

  return (
    <>
      <div className="container page-top">
        <div className="page-heading">
          <span className="eyebrow">Behind the scenes</span>
          <h1>The kitchen studio.</h1>
          <p>
            Create, edit, preview, and publish recipes and journal stories.
            Drafts stay private until you publish them.
          </p>
        </div>
      </div>
      <section className="container page-content admin-content">
        {loadError && (
          <ErrorMessage>
            We couldn’t load the content dashboard: {loadError}
          </ErrorMessage>
        )}
        {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        {notice && <p aria-live="polite" className="admin-notice">{notice}</p>}

        <div className="admin-toolbar">
          <h2>Editorial content</h2>
          <div className="admin-actions">
            <button
              className="button button-outline"
              onClick={() => startNew('recipe')}
              type="button"
            >
              New recipe
            </button>
            <button
              className="button"
              onClick={() => startNew('blog')}
              type="button"
            >
              New journal post
            </button>
          </div>
        </div>

        {isEditorOpen && (
          <section aria-labelledby="editor-heading" className="editor-panel">
            <div className="editor-heading">
              <div>
                <span className="eyebrow">
                  {contentType === 'recipe' ? 'Recipe editor' : 'Journal editor'}
                </span>
                <h2 id="editor-heading">
                  {editingItem ? 'Edit content' : 'Create content'}
                </h2>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setIsEditorOpen(false)
                  setEditingItem(null)
                  setForm(createEmptyForm(contentType))
                  setIngredientErrors({})
                  setCoverFile(null)
                }}
                type="button"
              >
                Close editor
              </button>
            </div>
            <div className="editor-type-switch" aria-label="Content type">
              <button
                aria-pressed={contentType === 'recipe'}
                className={`filter-chip${contentType === 'recipe' ? ' selected' : ''}`}
                disabled={Boolean(editingItem)}
                onClick={() => {
                  setContentType('recipe')
                  setForm(createEmptyForm('recipe'))
                  setIngredientErrors({})
                }}
                type="button"
              >
                Recipe
              </button>
              <button
                aria-pressed={contentType === 'blog'}
                className={`filter-chip${contentType === 'blog' ? ' selected' : ''}`}
                disabled={Boolean(editingItem)}
                onClick={() => {
                  setContentType('blog')
                  setForm(createEmptyForm('blog'))
                  setIngredientErrors({})
                }}
                type="button"
              >
                Journal post
              </button>
            </div>
            <form
              className="content-editor"
              noValidate
              onSubmit={handleSubmit}
            >
              <div className="form-grid">
                <label>
                  Title
                  <input
                    maxLength={160}
                    onChange={(event) => updateField('title', event.target.value)}
                    required
                    value={form.title}
                  />
                </label>
                <label>
                  URL slug
                  <input
                    maxLength={180}
                    onChange={(event) => updateField('slug', event.target.value)}
                    required
                    value={form.slug}
                  />
                </label>
                <label>
                  Category
                  <input
                    maxLength={80}
                    onChange={(event) => updateField('category', event.target.value)}
                    required
                    value={form.category}
                  />
                </label>
                <label className="form-span">
                  Short description
                  <textarea
                    maxLength={500}
                    onChange={(event) => updateField('excerpt', event.target.value)}
                    rows={3}
                    value={form.excerpt}
                  />
                </label>
                <label className="form-span">
                  Cover image
                  <input
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={(event) =>
                      setCoverFile(event.target.files?.[0] ?? null)
                    }
                    type="file"
                  />
                  <span className="field-hint">
                    JPEG, PNG, WebP, or AVIF. Maximum size: 5 MB.
                  </span>
                </label>
                <label className="form-span">
                  Cover image description
                  <input
                    maxLength={240}
                    onChange={(event) =>
                      updateField('cover_image_alt', event.target.value)
                    }
                    value={form.cover_image_alt}
                  />
                </label>

                {contentType === 'recipe' ? (
                  <>
                    <label>
                      Preparation time (minutes)
                      <input
                        min="0"
                        onChange={(event) =>
                          updateField('prep_time_minutes', event.target.value)
                        }
                        required
                        type="number"
                        value={form.prep_time_minutes}
                      />
                    </label>
                    <label>
                      Cooking time (minutes)
                      <input
                        min="0"
                        onChange={(event) =>
                          updateField('cook_time_minutes', event.target.value)
                        }
                        required
                        type="number"
                        value={form.cook_time_minutes}
                      />
                    </label>
                    <label>
                      Servings
                      <input
                        min="1"
                        onChange={(event) =>
                          updateField('servings', event.target.value)
                        }
                        required
                        type="number"
                        value={form.servings}
                      />
                    </label>
                    <fieldset className="ingredient-editor form-span">
                      <legend>Ingredients</legend>
                      <p className="field-hint">
                        Add each ingredient separately. Quantity supports up to
                        three decimal places.
                      </p>
                      {ingredientErrors.form && (
                        <p className="field-error" role="alert">
                          {ingredientErrors.form}
                        </p>
                      )}
                      <div className="ingredient-list">
                        {form.ingredients.map((ingredient, index) => {
                          const errors = ingredientErrors[ingredient.id] ?? {}
                          const nameId = `ingredient-${ingredient.id}-name`
                          const quantityId = `ingredient-${ingredient.id}-quantity`
                          const unitId = `ingredient-${ingredient.id}-unit`
                          const notesId = `ingredient-${ingredient.id}-notes`

                          return (
                            <div
                              className="ingredient-row"
                              key={ingredient.id}
                            >
                              <div className="ingredient-row-heading">
                                <h3>Ingredient {index + 1}</h3>
                                <button
                                  className="text-button text-button-danger"
                                  onClick={() => removeIngredient(ingredient.id)}
                                  type="button"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="ingredient-fields">
                                <label htmlFor={nameId}>
                                  Ingredient name
                                  <input
                                    aria-describedby={
                                      errors.name ? `${nameId}-error` : undefined
                                    }
                                    aria-invalid={Boolean(errors.name)}
                                    autoComplete="off"
                                    id={nameId}
                                    onChange={(event) =>
                                      updateIngredient(
                                        ingredient.id,
                                        'name',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="e.g. Ripe tomatoes"
                                    required
                                    value={ingredient.name}
                                  />
                                  {errors.name && (
                                    <span
                                      className="field-error"
                                      id={`${nameId}-error`}
                                    >
                                      {errors.name}
                                    </span>
                                  )}
                                </label>
                                <label htmlFor={quantityId}>
                                  Quantity
                                  <input
                                    aria-describedby={
                                      errors.quantity
                                        ? `${quantityId}-error`
                                        : undefined
                                    }
                                    aria-invalid={Boolean(errors.quantity)}
                                    id={quantityId}
                                    inputMode="decimal"
                                    max="9999999.999"
                                    min="0.01"
                                    onChange={(event) =>
                                      updateIngredient(
                                        ingredient.id,
                                        'quantity',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="e.g. 1.25"
                                    required
                                    step="0.001"
                                    type="number"
                                    value={ingredient.quantity}
                                  />
                                  {errors.quantity && (
                                    <span
                                      className="field-error"
                                      id={`${quantityId}-error`}
                                    >
                                      {errors.quantity}
                                    </span>
                                  )}
                                </label>
                                <label htmlFor={unitId}>
                                  Unit
                                  <input
                                    aria-describedby={
                                      errors.unit ? `${unitId}-error` : undefined
                                    }
                                    aria-invalid={Boolean(errors.unit)}
                                    autoComplete="off"
                                    id={unitId}
                                    onChange={(event) =>
                                      updateIngredient(
                                        ingredient.id,
                                        'unit',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="e.g. g, tbsp, pieces"
                                    required
                                    value={ingredient.unit}
                                  />
                                  {errors.unit && (
                                    <span
                                      className="field-error"
                                      id={`${unitId}-error`}
                                    >
                                      {errors.unit}
                                    </span>
                                  )}
                                </label>
                                <label htmlFor={notesId}>
                                  Note (optional)
                                  <input
                                    autoComplete="off"
                                    id={notesId}
                                    onChange={(event) =>
                                      updateIngredient(
                                        ingredient.id,
                                        'notes',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="e.g. finely chopped"
                                    value={ingredient.notes}
                                  />
                                </label>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <button
                        className="button button-outline"
                        onClick={addIngredient}
                        type="button"
                      >
                        Add ingredient
                      </button>
                    </fieldset>
                    <label className="form-span">
                      Numbered instructions
                      <textarea
                        onChange={(event) =>
                          updateField('instructions', event.target.value)
                        }
                        placeholder="Write one instruction per line."
                        rows={7}
                        value={form.instructions}
                      />
                    </label>
                  </>
                ) : (
                  <label className="form-span">
                    Story text
                    <textarea
                      onChange={(event) => updateField('body', event.target.value)}
                      placeholder="Separate paragraphs with a blank line."
                      required={form.status === 'published'}
                      rows={12}
                      value={form.body}
                    />
                  </label>
                )}
              </div>
              {isPreviewing && (
                <Preview
                  form={form}
                  imageUrl={imageUrl}
                  type={contentType}
                />
              )}
              <div className="editor-actions">
                <button
                  className="button button-outline"
                  onClick={() => setIsPreviewing((current) => !current)}
                  type="button"
                >
                  {isPreviewing ? 'Hide preview' : 'Preview'}
                </button>
                <button
                  className="button button-outline"
                  disabled={isSaving}
                  type="submit"
                  value={editingItem?.status ?? 'draft'}
                >
                  {isSaving
                    ? 'Saving…'
                    : editingItem
                      ? 'Save changes'
                      : 'Save draft'}
                </button>
                <button
                  className="button"
                  disabled={isSaving}
                  type="submit"
                  value="published"
                >
                  {isSaving ? 'Saving…' : 'Save & publish'}
                </button>
              </div>
            </form>
          </section>
        )}

        {content.length === 0 && !loadError ? (
          <div className="empty-state">
            <h2>No content yet.</h2>
            <p>Create a recipe or journal story to get started.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="sr-only">Recipes and journal posts</caption>
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Publication date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {content.map((item) => (
                  <tr key={`${item.content_type}-${item.id}`}>
                    <th scope="row">{item.title}</th>
                    <td>{item.content_type === 'recipe' ? 'Recipe' : 'Journal'}</td>
                    <td>
                      <span className={`admin-status status-${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>{formatContentDate(item.published_at)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="text-button"
                          onClick={() => startEditing(item)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="text-button"
                          onClick={() => {
                            startEditing(item)
                            setIsPreviewing(true)
                          }}
                          type="button"
                        >
                          Preview
                        </button>
                        <button
                          className="text-button"
                          disabled={busyItemId === item.id}
                          onClick={() => handleStatusChange(item)}
                          type="button"
                        >
                          {item.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          className="text-button text-button-danger"
                          onClick={() => setDeleteTarget(item)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                      {deleteTarget?.id === item.id && (
                        <div className="delete-confirm" role="group">
                          <span>Delete this content permanently?</span>
                          <button
                            className="text-button text-button-danger"
                            disabled={busyItemId === item.id}
                            onClick={() => handleDelete(item)}
                            type="button"
                          >
                            {busyItemId === item.id ? 'Deleting…' : 'Confirm'}
                          </button>
                          <button
                            className="text-button"
                            onClick={() => setDeleteTarget(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
