import { CountBadge } from '../common'
import './sidebar.css'

export function SidebarItem({
  icon: Icon,
  label,
  count,
  selected,
  onClick,
  indent = false
}) {
  return (
    <button
      className={`sidebar-item ${selected ? 'sidebar-item--selected' : ''} ${indent ? 'sidebar-item--indent' : ''}`}
      onClick={onClick}
    >
      {Icon && (
        <span className="sidebar-item__icon">
          <Icon size={16} />
        </span>
      )}
      <span className="sidebar-item__label">{label}</span>
      <CountBadge count={count} />
    </button>
  )
}
