import './layout.css'

export function MainContent({ children }) {
  return (
    <main className="main-content">
      {children}
    </main>
  )
}

export function EmptyState({ message, icon: Icon }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={48} className="empty-state__icon" />}
      <p className="empty-state__message">{message}</p>
    </div>
  )
}

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="loading-state">
      <div className="loading-state__spinner"></div>
      <p className="loading-state__message">{message}</p>
    </div>
  )
}
