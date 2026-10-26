import { Link } from 'react-router-dom'
import ArrowIcon from './ArrowIcon.jsx'
import './EditorialCard.css'

export default function EditorialCard({ item }) {
  const isRecipe = item.content_type === 'recipe'
  const publicationDate = item.publication_date ?? item.published_at
  const parsedPublicationDate = publicationDate
    ? new Date(publicationDate)
    : null
  const hasValidPublicationDate =
    parsedPublicationDate && !Number.isNaN(parsedPublicationDate.getTime())
  const to = isRecipe
    ? `/recipes/${item.slug}`
    : `/journal/${item.slug}`
  const detail = isRecipe
    ? `${item.prep_time_minutes + item.cook_time_minutes} min · Serves ${item.servings}`
    : 'From the journal'

  return (
    <article className="post-card editorial-card">
      <Link
        aria-label={`Read ${isRecipe ? 'recipe' : 'story'}: ${item.title}`}
        className="card-image-link"
        to={to}
      >
        {item.cover_image_url ? (
          <img
            alt={item.cover_image_alt || item.title}
            loading="lazy"
            src={item.cover_image_url}
          />
        ) : (
          <span aria-hidden="true" className="cover-placeholder">
            Olive & Thyme
          </span>
        )}
        <span className="card-category">{item.category}</span>
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span>{item.content_type === 'recipe' ? 'Recipe' : 'Journal'}</span>
          <span aria-hidden="true" className="dot" />
          <time
            dateTime={
              hasValidPublicationDate
                ? parsedPublicationDate.toISOString()
                : undefined
            }
          >
            {hasValidPublicationDate
              ? new Intl.DateTimeFormat(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }).format(parsedPublicationDate)
              : 'Date unavailable'}
          </time>
        </div>
        <Link className="card-title" to={to}>
          {item.title}
        </Link>
        <p className="post-excerpt">{item.excerpt}</p>
        <div className="card-footer">
          <span>{detail}</span>
          <Link aria-label={`Read ${item.title}`} className="text-link" to={to}>
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </article>
  )
}
