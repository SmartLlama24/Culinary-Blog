import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="container not-found">
      <div className="page-heading">
        <span className="eyebrow">A little detour</span>
        <h1>That page isn’t on the menu.</h1>
        <p>Let’s head back to something good.</p>
        <Link className="button" to="/">
          Back to the homepage
        </Link>
      </div>
    </section>
  )
}
