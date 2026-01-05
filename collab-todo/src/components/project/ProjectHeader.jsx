import { useState, useRef, useEffect } from 'react'
import { Circle } from 'lucide-react'
import './project.css'

export function ProjectHeader({
  title,
  subtitle,
  icon: Icon = Circle,
  notes,
  onNotesChange,
  showNotes = true,
  canRename = false,
  onRename
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleTitleClick = () => {
    if (canRename && onRename) {
      setEditValue(title)
      setEditing(true)
    }
  }

  const handleSubmit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== title) {
      onRename?.(trimmed)
    }
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  return (
    <div className="project-header">
      <div className="project-header__top">
        <div className="project-header__icon">
          <Icon size={24} />
        </div>
        <div className="project-header__info">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              className="project-header__title-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSubmit}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <h1
              className={`project-header__title ${canRename ? 'project-header__title--editable' : ''}`}
              onClick={handleTitleClick}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <span className="project-header__subtitle">{subtitle}</span>
          )}
        </div>
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
