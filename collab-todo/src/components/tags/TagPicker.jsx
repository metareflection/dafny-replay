import { useState, useRef, useEffect } from 'react'
import { Tag, Check, Plus } from 'lucide-react'
import './tags.css'

/**
 * TagPicker - Dropdown for adding/removing tags from a task
 *
 * Props:
 *   allTags: { [id]: { name } } - All tags in the project
 *   selectedIds: number[] - Tag IDs currently on the task
 *   onToggle: (tagId: number, selected: boolean) => void - Toggle a tag
 *   onCreate?: (name: string) => void - Create a new tag (optional)
 *   customTrigger?: ReactNode - Custom trigger element (default: tag icon button)
 */
export function TagPicker({
  allTags = {},
  selectedIds = [],
  onToggle,
  onCreate,
  customTrigger
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Convert tags object to array and filter by search
  const tagList = Object.entries(allTags)
    .map(([id, tag]) => ({ id: Number(id), name: tag.name }))
    .filter(tag => tag.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const selectedSet = new Set(selectedIds)

  // Check if search matches an existing tag name exactly
  const exactMatch = tagList.some(t => t.name.toLowerCase() === search.toLowerCase())
  const canCreate = onCreate && search.trim() && !exactMatch

  const handleToggle = (tagId) => {
    const isSelected = selectedSet.has(tagId)
    onToggle(tagId, !isSelected)
  }

  const handleCreate = () => {
    if (canCreate) {
      onCreate(search.trim())
      setSearch('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && canCreate) {
      e.preventDefault()
      handleCreate()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
    }
  }

  return (
    <div className="tag-picker" ref={containerRef}>
      {customTrigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>{customTrigger}</div>
      ) : (
        <button
          className="tag-picker__trigger"
          onClick={() => setIsOpen(!isOpen)}
          title="Manage tags"
        >
          <Tag size={14} />
        </button>
      )}

      {isOpen && (
        <div className="tag-picker__dropdown">
          <div className="tag-picker__search">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or create tag..."
              className="tag-picker__input"
            />
          </div>

          <div className="tag-picker__list">
            {tagList.map(tag => (
              <button
                key={tag.id}
                className={`tag-picker__item ${selectedSet.has(tag.id) ? 'tag-picker__item--selected' : ''}`}
                onClick={() => handleToggle(tag.id)}
              >
                <span className="tag-picker__item-name">{tag.name}</span>
                {selectedSet.has(tag.id) && <Check size={14} />}
              </button>
            ))}

            {tagList.length === 0 && !canCreate && (
              <div className="tag-picker__empty">No tags found</div>
            )}

            {canCreate && (
              <button className="tag-picker__create" onClick={handleCreate}>
                <Plus size={14} />
                <span>Create "{search.trim()}"</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
