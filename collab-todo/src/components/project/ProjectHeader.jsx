import { Circle, MoreHorizontal } from 'lucide-react'
import './project.css'

export function ProjectHeader({
  title,
  subtitle,
  icon: Icon = Circle,
  notes,
  onNotesChange,
  showNotes = true
}) {
  return (
    <div className="project-header">
      <div className="project-header__top">
        <div className="project-header__icon">
          <Icon size={24} />
        </div>
        <div className="project-header__info">
          <h1 className="project-header__title">{title}</h1>
          {subtitle && (
            <span className="project-header__subtitle">{subtitle}</span>
          )}
        </div>
        <button className="project-header__menu">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {showNotes && (
        <div className="project-header__notes">
          <textarea
            placeholder="Notes"
            value={notes || ''}
            onChange={(e) => onNotesChange?.(e.target.value)}
            className="project-header__notes-input"
            rows={1}
          />
        </div>
      )}
    </div>
  )
}
