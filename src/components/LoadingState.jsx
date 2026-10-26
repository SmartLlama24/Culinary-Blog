export default function LoadingState({ label = 'Gathering something good…' }) {
  return (
    <div aria-live="polite" className="loading-state" role="status">
      {label}
    </div>
  )
}
