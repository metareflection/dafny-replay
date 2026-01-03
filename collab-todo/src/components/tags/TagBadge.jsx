import { X } from 'lucide-react'
import './tags.css'

/**
 * TagBadge - Displays a single tag as a chip/badge
 *
 * Props:
 *   name: string - Tag name to display
 *   onRemove?: () => void - If provided, shows remove button
 *   onClick?: () => void - If provided, makes tag clickable
 */
export function TagBadge({ name, onRemove, onClick }) {
  const isInteractive = onClick || onRemove

  return (
    <span
      className={`tag-badge ${isInteractive ? 'tag-badge--interactive' : ''}`}
      onClick={onClick}
    >
      <span className="tag-badge__name">{name}</span>
      {onRemove && (
        <button
          className="tag-badge__remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove tag ${name}`}
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}
