import { Link } from 'react-router-dom'
import ArrowIcon from './ArrowIcon.jsx'

export default function PostCard({ post }) {
  return (
    <article className="post-card">
      <Link
        aria-label={`Read article: ${post.title}`}
        className="card-image-link"
        to={`/journal/${post.slug}`}
      >
        <img src={post.image} alt={post.imageAlt} loading="lazy" />
        <span className="card-category">{post.category}</span>
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span>{post.date}</span>
          <span className="dot" aria-hidden="true" />
          <span>{post.readTime}</span>
        </div>
        <Link className="card-title" to={`/journal/${post.slug}`}>
          {post.title}
        </Link>
        <p className="post-excerpt">{post.excerpt}</p>
        <Link className="text-link" to={`/journal/${post.slug}`}>
          Read the story <ArrowIcon />
        </Link>
      </div>
    </article>
  )
}
