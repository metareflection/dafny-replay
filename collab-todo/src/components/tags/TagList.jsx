import { TagBadge } from './TagBadge'
import './tags.css'

/**
 * TagList - Displays a list of tags for a task
 *
 * Props:
 *   tagIds: number[] - Array of tag IDs on the task
 *   allTags: { [id]: { name } } - All tags in the project (from App.GetAllTags)
 *   onRemove?: (tagId: number) => void - If provided, tags are removable
 *   onClick?: () => void - If provided, clicking the list triggers this
 *   compact?: boolean - If true, shows "+N" for overflow
 *   maxVisible?: number - Max tags to show before "+N" (default: 3)
 */
export function TagList({
  tagIds = [],
  allTags = {},
  onRemove,
  onClick,
  compact = false,
  maxVisible = 3
}) {
  if (!tagIds || tagIds.length === 0) {
    return null
  }

  // Resolve tag names from IDs
  const tags = tagIds
    .map(id => ({ id, name: allTags[id]?.name }))
    .filter(t => t.name) // Filter out missing tags

  if (tags.length === 0) {
    return null
  }

  const visibleTags = compact ? tags.slice(0, maxVisible) : tags
  const hiddenCount = compact ? Math.max(0, tags.length - maxVisible) : 0

  return (
    <div className={`tag-list ${onClick ? 'tag-list--clickable' : ''}`} onClick={onClick}>
      {visibleTags.map(tag => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          onRemove={onRemove ? () => onRemove(tag.id) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="tag-list__overflow">+{hiddenCount}</span>
      )}
    </div>
  )
}
