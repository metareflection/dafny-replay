import './common.css'

export function Badge({ children, variant = 'default', size = 'sm' }) {
  return (
    <span className={`badge badge--${variant} badge--${size}`}>
      {children}
    </span>
  )
}

export function CountBadge({ count }) {
  if (!count || count === 0) return null
  return (
    <span className="count-badge">
      {count}
    </span>
  )
}
