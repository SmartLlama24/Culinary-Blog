import EditorialCard from '../components/EditorialCard.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { usePublishedPosts } from '../hooks/useContent.js'

export default function BlogPage() {
  const { data: posts, error, isLoading } = usePublishedPosts()

  return (
    <>
      <div className="container page-top">
        <div className="page-heading">
          <span className="eyebrow">Notes from our table</span>
          <h1>The journal.</h1>
          <p>
            Field notes, kitchen thoughts, and the small rituals that make a
            meal feel like more than a meal.
          </p>
        </div>
      </div>
      <section className="container page-content" aria-label="Journal stories">
        {error ? (
          <ErrorMessage>We couldn’t load journal stories: {error}</ErrorMessage>
        ) : isLoading ? (
          <LoadingState label="Gathering stories from the table…" />
        ) : posts?.length ? (
          <div className="card-grid">
            {posts.map((post) => (
              <EditorialCard
                item={{ ...post, content_type: 'blog' }}
                key={post.id}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>No stories just yet.</h2>
            <p>Our next kitchen note will be here soon.</p>
          </div>
        )}
      </section>
    </>
  )
}
