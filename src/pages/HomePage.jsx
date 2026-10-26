import { Link } from 'react-router-dom'
import ArrowIcon from '../components/ArrowIcon.jsx'
import EditorialCard from '../components/EditorialCard.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { usePublishedFeed } from '../hooks/useContent.js'

export default function HomePage() {
  const { data: feed, error, isLoading } = usePublishedFeed()

  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <span className="eyebrow">A seasonal kitchen journal</span>
          <h1>
            Make room
            <br />
            for <em>good food.</em>
          </h1>
          <p>
            Recipes to cook, stories to savor, and little reminders that the
            best things are often shared around a table.
          </p>
          <div className="hero-links">
            <Link className="button" to="/recipes">
              Explore recipes <ArrowIcon />
            </Link>
            <Link className="text-link" to="/journal">
              Read our journal
            </Link>
          </div>
        </div>
        <div className="hero-photo-wrap">
          <img
            alt="A colorful seasonal meal served family-style on a wooden table"
            className="hero-photo"
            src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=90"
          />
          <div className="photo-note">
            <span>From the kitchen</span>
            <strong>Cook with the season</strong>
          </div>
        </div>
      </section>

      <section className="home-section section-tint">
        <div className="container">
          <SectionHeading
            eyebrow="Fresh from the kitchen"
            title="Around the table"
          >
            A chronological collection of our latest recipes and journal
            stories.
          </SectionHeading>
          {error ? (
            <ErrorMessage>We couldn’t load the latest stories: {error}</ErrorMessage>
          ) : isLoading ? (
            <LoadingState label="Gathering the latest from our table…" />
          ) : feed?.length > 0 ? (
            <div className="card-grid">
              {feed.map((item) => (
                <EditorialCard
                  item={item}
                  key={`${item.content_type}-${item.id}`}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>Something good is on the way.</h2>
              <p>Our first published recipes and stories will be right here.</p>
            </div>
          )}
          <div className="section-more">
            <Link className="text-link" to="/recipes">
              Browse all recipes <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <section className="container home-section home-newsletter">
        <div className="newsletter-band">
          <div>
            <h2>A little something for your inbox.</h2>
            <p>Seasonal recipes and notes from our kitchen, now and then.</p>
          </div>
          <Link className="button" to="/register">
            Join the table <ArrowIcon />
          </Link>
        </div>
      </section>
    </>
  )
}
