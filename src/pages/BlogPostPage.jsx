import { Link, useParams } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingState from '../components/LoadingState.jsx'
import CommentsSection from '../components/CommentsSection.jsx'
import { usePublishedPost } from '../hooks/useContent.js'
import { formatContentDate } from '../lib/content.js'

export default function BlogPostPage() {
  const { slug } = useParams()
  const { data: post, error, isLoading } = usePublishedPost(slug)

  if (isLoading) {
    return (
      <section className="container article-wrap">
        <LoadingState label="Gathering the story…" />
      </section>
    )
  }

  if (error || !post) {
    return (
      <section className="container page-content page-top">
        {error ? (
          <ErrorMessage>We couldn’t load this journal story: {error}</ErrorMessage>
        ) : (
          <div className="empty-state">
            <h2>We couldn’t find that journal story.</h2>
            <p>It may be unpublished or no longer available.</p>
          </div>
        )}
        <p className="back-link">
          <Link className="text-link" to="/journal">
            Back to the journal
          </Link>
        </p>
      </section>
    )
  }

  return (
    <article className="container article-wrap">
      <span className="eyebrow">{post.category}</span>
      <h1 className="article-title">{post.title}</h1>
      <p className="detail-lede">{post.excerpt}</p>
      <div className="article-byline">
        <span aria-hidden="true" className="author-avatar">
          O
        </span>
        <span>
          By the Olive & Thyme kitchen <span aria-hidden="true">·</span>{' '}
          {formatContentDate(post.published_at)}
        </span>
      </div>
      {post.cover_image_url && (
        <img
          className="detail-hero"
          src={post.cover_image_url}
          alt={post.cover_image_alt || post.title}
        />
      )}
      <div className="article-body">
        {post.body
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((paragraph, index) => (
            <p key={`${index}-${paragraph}`}>{paragraph}</p>
          ))}
        <h2>Stay for one more cup.</h2>
        <p>
          Thanks for being here. Find more ideas for the table in our{' '}
          <Link className="inline-link" to="/recipes">
            recipe collection
          </Link>
          .
        </p>
      </div>
      <CommentsSection contentId={post.id} contentType="article" />
    </article>
  )
}
