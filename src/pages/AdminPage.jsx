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

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  category: '',
  cover_image_alt: '',
  prep_time_minutes: '0',
  cook_time_minutes: '0',
  servings: '2',
  ingredients: '',
  instructions: '',
  body: '',
}

function splitLines(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function recipeFormContent(item) {
  return {
    ...emptyForm,
    ...item,
    prep_time_minutes: String(item.prep_time_minutes),
    cook_time_minutes: String(item.cook_time_minutes),
    servings: String(item.servings),
    ingredients: item.recipe_ingredients
      .map((ingredient) =>
        [
          ingredient.ingredient_name,
          ingredient.quantity ?? '',
          ingredient.unit ?? '',
          ingredient.notes ?? '',
        ].join(' | '),
      )
      .join('\n'),
    instructions: item.recipe_instructions
      .map((step) => step.instruction)
      .join('\n'),
  }
}

function postFormContent(item) {
  return { ...emptyForm, ...item }
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
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => (
                <li key={line}>{line.split('|').map((part) => part.trim()).filter(Boolean).join(' ')}</li>
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
  const [form, setForm] = useState(emptyForm)
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
    setForm(emptyForm)
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

  function refreshContent() {
    setReloadKey((current) => current + 1)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setNotice('')
    setIsSaving(true)

    let uploadedPath = null
    let contentId = null
    const previousPath = editingItem?.cover_image_path ?? null
    const submitStatus = event.nativeEvent.submitter?.value ?? editingItem?.status ?? 'draft'
    let saveNotice = 'Content saved successfully.'

    try {
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
        const ingredients = splitLines(form.ingredients).map((line) => {
          const [name = '', quantity = '', unit = '', notes = ''] = line
            .split('|')
            .map((part) => part.trim())
          return { name, quantity, unit, notes }
        })
        const instructions = splitLines(form.instructions)

        if (
          submitStatus === 'published' &&
          (ingredients.length === 0 || instructions.length === 0)
        ) {
          throw new Error(
            'Add at least one ingredient and instruction before publishing.',
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
      setForm(emptyForm)
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
                  setForm(emptyForm)
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
                  setForm(emptyForm)
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
                  setForm(emptyForm)
                }}
                type="button"
              >
                Journal post
              </button>
            </div>
            <form className="content-editor" onSubmit={handleSubmit}>
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
                    <label className="form-span">
                      Ingredients
                      <textarea
                        onChange={(event) =>
                          updateField('ingredients', event.target.value)
                        }
                        placeholder={'One per line: Name | quantity | unit | notes\nLemon | 1 | whole | zest and juice'}
                        rows={6}
                        value={form.ingredients}
                      />
                    </label>
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
