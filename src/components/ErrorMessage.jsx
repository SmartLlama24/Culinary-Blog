export default function ErrorMessage({ children }) {
  return (
    <div className="error-message" role="alert">
      {children}
    </div>
  )
}
