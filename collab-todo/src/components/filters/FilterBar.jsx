import { useState, useRef, useEffect } from 'react'
import { SlidersHorizontal, ArrowUpDown, User, Tag, Check } from 'lucide-react'
import './filters.css'

export function FilterBar({
  sortBy = 'created-desc',
  onSortChange,
  // User filter
  allMembers = [],
  selectedUserIds = [],
  onUserFilterChange,
  // Tag filter
  allTags = {},
  selectedTagIds = [],
  onTagFilterChange,
  // What filters to show
  showUserFilter = true,
  showTagFilter = true,
  showDueDateSort = true
}) {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef(null)

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const sortOptions = [
    { id: 'created-desc', label: 'Newest first' },
    { id: 'created-asc', label: 'Oldest first' },
    ...(showDueDateSort ? [{ id: 'due-date', label: 'Due date (soonest)' }] : [])
  ]

  const toggleUser = (userId) => {
    if (selectedUserIds.includes(userId)) {
      onUserFilterChange?.(selectedUserIds.filter(id => id !== userId))
    } else {
      onUserFilterChange?.([...selectedUserIds, userId])
    }
  }

  const toggleTag = (tagId) => {
    if (selectedTagIds.includes(tagId)) {
      onTagFilterChange?.(selectedTagIds.filter(id => id !== tagId))
    } else {
      onTagFilterChange?.([...selectedTagIds, tagId])
    }
  }

  // Keep ID as-is: numeric for project views, string (name) for cross-project views
  const tagArray = Object.entries(allTags).map(([id, tag]) => {
    const numId = Number(id)
    return { id: Number.isNaN(numId) ? id : numId, ...tag }
  })

  const hasActiveFilters = selectedUserIds.length > 0 || selectedTagIds.length > 0
  const activeFilterCount = selectedUserIds.length + selectedTagIds.length
  const showUsersSection = showUserFilter && allMembers.length > 0
  const showTagsSection = showTagFilter && tagArray.length > 0

  const clearAll = () => {
    onUserFilterChange?.([])
    onTagFilterChange?.([])
  }

  return (
    <div className="filter-icon" ref={panelRef}>
      <button
        className={`filter-icon__btn ${hasActiveFilters ? 'filter-icon__btn--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Filters"
      >
        <SlidersHorizontal size={14} />
        {activeFilterCount > 0 && (
          <span className="filter-icon__badge">{activeFilterCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="filter-panel">
          {/* Sort section */}
          <div className="filter-panel__section">
            <div className="filter-panel__label">
              <ArrowUpDown size={12} />
              Sort
            </div>
            <div className="filter-panel__options">
              {sortOptions.map(option => (
                <button
                  key={option.id}
                  className={`filter-panel__option ${sortBy === option.id ? 'filter-panel__option--active' : ''}`}
                  onClick={() => onSortChange?.(option.id)}
                >
                  <span className="filter-panel__check">
                    {sortBy === option.id && <Check size={12} />}
                  </span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* User filter section */}
          {showUsersSection && (
            <div className="filter-panel__section">
              <div className="filter-panel__label">
                <User size={12} />
                Assignee
                {selectedUserIds.length > 0 && (
                  <button
                    className="filter-panel__clear-section"
                    onClick={() => onUserFilterChange?.([])}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="filter-panel__options">
                {allMembers.map(member => (
                  <button
                    key={member.user_id}
                    className={`filter-panel__option ${selectedUserIds.includes(member.user_id) ? 'filter-panel__option--active' : ''}`}
                    onClick={() => toggleUser(member.user_id)}
                  >
                    <span className="filter-panel__check">
                      {selectedUserIds.includes(member.user_id) && <Check size={12} />}
                    </span>
                    {member.email?.split('@')[0] || member.user_id.slice(0, 8)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tag filter section */}
          {showTagsSection && (
            <div className="filter-panel__section">
              <div className="filter-panel__label">
                <Tag size={12} />
                Tags
                {selectedTagIds.length > 0 && (
                  <button
                    className="filter-panel__clear-section"
                    onClick={() => onTagFilterChange?.([])}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="filter-panel__options">
                {tagArray.map(tag => (
                  <button
                    key={tag.id}
                    className={`filter-panel__option ${selectedTagIds.includes(tag.id) ? 'filter-panel__option--active' : ''}`}
                    onClick={() => toggleTag(tag.id)}
                  >
                    <span className="filter-panel__check">
                      {selectedTagIds.includes(tag.id) && <Check size={12} />}
                    </span>
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear all */}
          {hasActiveFilters && (
            <div className="filter-panel__footer">
              <button
                className="filter-panel__clear-all"
                onClick={clearAll}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
