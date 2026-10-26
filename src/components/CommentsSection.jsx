import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import ErrorMessage from './ErrorMessage.jsx'
import LoadingState from './LoadingState.jsx'
import { supabase, supabaseConfigError } from '../lib/supabaseClient.js'

const MAX_COMMENT_LENGTH = 2000

function formatCommentDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function CommentsSection({ contentId, contentType }) {
  const { profile, user } = useAuth()
  const location = useLocation()
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const deletionLock = useRef(false)
  const isAdmin = profile?.role === 'admin'
  const contentColumn = contentType === 'recipe' ? 'recipe_id' : 'blog_post_id'
  const contentLabel = contentType === 'recipe' ? 'recipe' : 'article'

  useEffect(() => {
    let isActive = true

    async function loadComments() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        if (!supabase) throw new Error(supabaseConfigError)
        const { data, error } = await supabase
          .from('comments')
          .select(
            'id, author_id, author_display_name, body, created_at, updated_at',
          )
          .eq(contentColumn, contentId)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })

        if (error) throw error
        if (isActive) setComments(data ?? [])
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message || 'Unable to load comments.')
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadComments()
    return () => {
      isActive = false
    }
  }, [contentColumn, contentId])

  function validateComment(value) {
    const normalized = value.trim()
    if (!normalized) return 'Write a comment before submitting.'
    if (normalized.length > MAX_COMMENT_LENGTH) {
      return `Comments must be ${MAX_COMMENT_LENGTH.toLocaleString()} characters or fewer.`
    }
    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setNotice('')
    const validationError = validateComment(commentText)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }
    if (!supabase || !user) {
      setErrorMessage('Sign in to post a comment.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          [contentColumn]: contentId,
          body: commentText.trim(),
        })
        .select(
          'id, author_id, author_display_name, body, created_at, updated_at',
        )
        .single()

      if (error) throw error
      setComments((current) =>
        [...current, data].sort(
          (first, second) =>
            new Date(first.created_at) - new Date(second.created_at),
        ),
      )
      setCommentText('')
      setNotice('Your comment was posted.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to post your comment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEditSubmit(event, commentId) {
    event.preventDefault()
    setErrorMessage('')
    setNotice('')
    const validationError = validateComment(editText)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }
    if (!supabase) {
      setErrorMessage(supabaseConfigError)
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .update({ body: editText.trim() })
        .eq('id', commentId)
        .select(
          'id, author_id, author_display_name, body, created_at, updated_at',
        )
        .single()

      if (error) throw error
      setComments((current) =>
        current.map((comment) => (comment.id === commentId ? data : comment)),
      )
      setEditingId(null)
      setEditText('')
      setNotice('Your comment was updated.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update your comment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(commentId) {
    if (deletionLock.current) return
    setErrorMessage('')
    setNotice('')
    if (!supabase) {
      setErrorMessage(supabaseConfigError)
      return
    }

    deletionLock.current = true
    setDeletingId(commentId)
    try {
      const { count, error } = await supabase
        .from('comments')
        .delete({ count: 'exact' })
        .eq('id', commentId)

      if (error) throw error
      if (count !== 1) {
        throw new Error(
          'No comment was deleted. It may no longer exist, or your account may not have permission to delete it.',
        )
      }
      setComments((current) =>
        current.filter((comment) => comment.id !== commentId),
      )
      setPendingDeleteId(null)
      setNotice('Comment deleted.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete your comment.')
    } finally {
      deletionLock.current = false
      setDeletingId(null)
    }
  }

  return (
    <section aria-labelledby={`${contentType}-comments-heading`} className="comments-section">
      <div className="comments-heading">
        <span className="eyebrow">The conversation</span>
        <h2 id={`${contentType}-comments-heading`}>Comments</h2>
      </div>

      {isLoading ? (
        <LoadingState label="Loading comments…" />
      ) : errorMessage && comments.length === 0 ? (
        <ErrorMessage>{errorMessage}</ErrorMessage>
      ) : comments.length === 0 ? (
        <p className="comments-empty">No comments yet. Be the first to join in.</p>
      ) : (
        <ol className="comments-list">
          {comments.map((comment) => {
            const isAuthor = user?.id === comment.author_id
            const canDelete = isAuthor || isAdmin
            const isEditing = editingId === comment.id
            const isConfirmingDelete = pendingDeleteId === comment.id

            return (
              <li className="comment-card" key={comment.id}>
                <div className="comment-byline">
                  <strong>{comment.author_display_name}</strong>
                  <time dateTime={comment.created_at}>
                    {formatCommentDate(comment.created_at)}
                    {comment.updated_at !== comment.created_at && ' · edited'}
                  </time>
                </div>
                {isEditing ? (
                  <form
                    className="comment-form comment-edit-form"
                    onSubmit={(event) => handleEditSubmit(event, comment.id)}
                  >
                    <label className="sr-only" htmlFor={`edit-comment-${comment.id}`}>
                      Edit your comment
                    </label>
                    <textarea
                      id={`edit-comment-${comment.id}`}
                      maxLength={MAX_COMMENT_LENGTH}
                      onChange={(event) => setEditText(event.target.value)}
                      required
                      rows={4}
                      value={editText}
                    />
                    <div className="comment-actions">
                      <button
                        className="button"
                        disabled={isSubmitting}
                        type="submit"
                      >
                        Save comment
                      </button>
                      <button
                        className="text-button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setEditingId(null)
                          setEditText('')
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="comment-body">{comment.body}</p>
                )}
                {(isAuthor || (isAdmin && !isAuthor)) && !isEditing && (
                  <div className="comment-actions">
                    {isAuthor && (
                      <button
                        className="text-button"
                        disabled={deletingId !== null}
                        onClick={() => {
                          setEditingId(comment.id)
                          setEditText(comment.body)
                          setPendingDeleteId(null)
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                    )}
                    {isConfirmingDelete ? (
                      <>
                        <span>
                          {isAuthor && !isAdmin
                            ? 'Delete your comment?'
                            : 'Delete this comment?'}
                        </span>
                        <button
                          className="text-button text-button-danger"
                          disabled={deletingId !== null}
                          onClick={() => handleDelete(comment.id)}
                          type="button"
                        >
                          {deletingId === comment.id
                            ? 'Deleting…'
                            : 'Confirm delete'}
                        </button>
                        <button
                          className="text-button"
                          disabled={deletingId !== null}
                          onClick={() => setPendingDeleteId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="text-button text-button-danger"
                        disabled={!canDelete || deletingId !== null}
                        onClick={() => setPendingDeleteId(comment.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {errorMessage && comments.length > 0 && <ErrorMessage>{errorMessage}</ErrorMessage>}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <label htmlFor={`${contentType}-new-comment`}>Add a comment</label>
          <textarea
            id={`${contentType}-new-comment`}
            maxLength={MAX_COMMENT_LENGTH}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder={`Share a helpful thought about this ${contentLabel}…`}
            required
            rows={5}
            value={commentText}
          />
          <div className="comment-form-footer">
            <span>{commentText.trim().length}/{MAX_COMMENT_LENGTH}</span>
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      ) : (
        <p className="comment-signin">
          <Link to="/login" state={{ from: location }}>
            Sign in
          </Link>{' '}
          to join the conversation.
        </p>
      )}
    </section>
  )
}
