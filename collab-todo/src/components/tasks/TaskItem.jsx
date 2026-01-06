import { useState, useRef, useEffect } from 'react'
import { Check, Star, MoreHorizontal, ArrowRight, Trash2, Calendar, Tag, User, FileText } from 'lucide-react'
import { TagPicker } from '../tags'
import { DueDatePicker } from '../duedate'
import { MemberPicker } from '../members'
import { NotesModal } from '../notes'
import './tasks.css'

export function TaskItem({
  task,
  taskId,
  projectName,
  showProject = false,
  onComplete,
  onStar,
  onEdit,
  onDelete,
  onMove,
  availableLists = [],
  allTags = {},
  onAddTag,
  onRemoveTag,
  onCreateTag,
  onSetDueDate,
  allMembers = [],
  onAssign,
  onUnassign
}) {
  const [expanded, setExpanded] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const menuRef = useRef(null)

  // Click outside to close menu
  useEffect(() => {
    if (!showMenu) return

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
        setShowMoveMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const formatDueDate = (dueDate) => {
    if (!dueDate) return null
    const date = new Date(dueDate.year, dueDate.month - 1, dueDate.day)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate.year, dueDate.month - 1, dueDate.day)
    return due < today && !task.completed
  }

  // Format assignees as @email
  const formatAssignees = () => {
    if (!task.assignees || task.assignees.length === 0) return null
    return task.assignees.map(userId => {
      const member = allMembers.find(m => m.user_id === userId)
      const name = member?.email?.split('@')[0] || userId.slice(0, 8)
      return `@${name}`
    }).join(', ')
  }

  // Format tags as #tagname
  const formatTags = () => {
    if (!task.tags || task.tags.length === 0) return null
    return task.tags.map(tagId => {
      const tag = allTags[tagId]
      return tag ? `#${tag.name}` : `#${tagId}`
    }).join(', ')
  }

  const handleSaveNotes = (notes) => {
    onEdit(taskId, task.title, notes)
  }

  const hasDueDate = !!task.dueDate
  const hasTags = task.tags && task.tags.length > 0
  const hasAssignees = task.assignees && task.assignees.length > 0
  const hasNotes = !!task.notes
  const hasMetadata = hasDueDate || hasTags || hasAssignees

  return (
    <div className={`task-item ${task.completed ? 'task-item--completed' : ''} ${task.starred ? 'task-item--starred' : ''} ${expanded ? 'task-item--expanded' : ''} ${showMenu ? 'task-item--menu-open' : ''}`}>
      <button
        className={`task-item__checkbox ${task.completed ? 'task-item__checkbox--checked' : ''}`}
        onClick={() => onComplete(taskId, !task.completed)}
      >
        {task.completed && <Check size={12} />}
      </button>

      <div className="task-item__main">
        <div className="task-item__content" onClick={() => setExpanded(!expanded)}>
          <div className="task-item__title-row">
            <span className="task-item__title">{task.title}</span>
            {showProject && projectName && (
              <span className="task-item__project">{projectName}</span>
            )}
          </div>
        </div>

        {/* Expanded metadata view */}
        {expanded && hasMetadata && (
          <div className="task-item__metadata">
            {hasAssignees && (
              <span className="task-item__metadata-item task-item__metadata-item--assignees">
                {formatAssignees()}
              </span>
            )}
            {hasTags && (
              <span className="task-item__metadata-item task-item__metadata-item--tags">
                {formatTags()}
              </span>
            )}
            {hasDueDate && (
              <span className={`task-item__metadata-item task-item__metadata-item--date ${isOverdue(task.dueDate) ? 'task-item__metadata-item--overdue' : ''}`}>
                {formatDueDate(task.dueDate)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Meta indicators - always show all icons, highlight set ones in sage */}
      <div className="task-item__indicators">
        {/* Due date indicator */}
        <div className={`task-item__indicator-wrapper task-item__indicator-wrapper--date ${hasDueDate ? 'task-item__indicator-wrapper--set' : ''}`}>
          {onSetDueDate ? (
            <DueDatePicker
              currentDate={task.dueDate}
              onSetDate={(date) => onSetDueDate(taskId, date)}
              customTrigger={
                <button
                  className={`task-item__indicator ${hasDueDate ? 'task-item__indicator--set' : ''} ${hasDueDate && isOverdue(task.dueDate) ? 'task-item__indicator--overdue' : ''}`}
                  title={hasDueDate ? formatDueDate(task.dueDate) : 'Set due date'}
                >
                  <Calendar size={12} />
                </button>
              }
            />
          ) : (
            <span
              className={`task-item__indicator ${hasDueDate ? 'task-item__indicator--set' : ''} ${hasDueDate && isOverdue(task.dueDate) ? 'task-item__indicator--overdue' : ''}`}
              title={hasDueDate ? formatDueDate(task.dueDate) : 'Due date'}
            >
              <Calendar size={12} />
            </span>
          )}
        </div>
        {/* Tags indicator */}
        <div className={`task-item__indicator-wrapper task-item__indicator-wrapper--tags ${hasTags ? 'task-item__indicator-wrapper--set' : ''}`}>
          {onAddTag ? (
            <TagPicker
              allTags={allTags}
              selectedIds={task.tags || []}
              onToggle={(tagId, selected) => {
                if (selected) {
                  onAddTag(taskId, tagId)
                } else {
                  onRemoveTag(taskId, tagId)
                }
              }}
              onCreate={onCreateTag ? (name) => onCreateTag(name) : undefined}
              customTrigger={
                <button
                  className={`task-item__indicator ${hasTags ? 'task-item__indicator--set' : ''}`}
                  title={hasTags ? `${task.tags.length} tag${task.tags.length > 1 ? 's' : ''}` : 'Add tags'}
                >
                  <Tag size={12} />
                </button>
              }
            />
          ) : (
            <span
              className={`task-item__indicator ${hasTags ? 'task-item__indicator--set' : ''}`}
              title={hasTags ? `${task.tags.length} tag${task.tags.length > 1 ? 's' : ''}` : 'Tags'}
            >
              <Tag size={12} />
            </span>
          )}
        </div>
        {/* Assignees indicator */}
        <div className={`task-item__indicator-wrapper task-item__indicator-wrapper--assignees ${hasAssignees ? 'task-item__indicator-wrapper--set' : ''}`}>
          {onAssign && allMembers.length > 0 ? (
            <MemberPicker
              allMembers={allMembers}
              selectedIds={task.assignees || []}
              onToggle={(userId, selected) => {
                if (selected) {
                  onAssign(taskId, userId)
                } else {
                  onUnassign(taskId, userId)
                }
              }}
              customTrigger={
                <button
                  className={`task-item__indicator ${hasAssignees ? 'task-item__indicator--set' : ''}`}
                  title={hasAssignees ? `${task.assignees.length} assignee${task.assignees.length > 1 ? 's' : ''}` : 'Assign'}
                >
                  <User size={12} />
                </button>
              }
            />
          ) : (
            <span
              className={`task-item__indicator ${hasAssignees ? 'task-item__indicator--set' : ''}`}
              title={hasAssignees ? `${task.assignees.length} assignee${task.assignees.length > 1 ? 's' : ''}` : 'Assignees'}
            >
              <User size={12} />
            </span>
          )}
        </div>
        {/* Notes indicator */}
        <div className={`task-item__indicator-wrapper task-item__indicator-wrapper--notes ${hasNotes ? 'task-item__indicator-wrapper--set' : ''}`}>
          <button
            className={`task-item__indicator ${hasNotes ? 'task-item__indicator--set' : ''}`}
            title={hasNotes ? 'Edit notes' : 'Add notes'}
            onClick={() => setShowNotesModal(true)}
          >
            <FileText size={12} />
          </button>
        </div>
      </div>

      <div className="task-item__actions">
        <button
          className={`task-item__star ${task.starred ? 'task-item__star--active' : ''}`}
          onClick={() => onStar(taskId, !task.starred)}
          title={task.starred ? 'Remove from Priority' : 'Add to Priority'}
        >
          <Star size={14} fill={task.starred ? 'currentColor' : 'none'} />
        </button>

        <div className="task-item__menu-container" ref={menuRef}>
          <button
            className="task-item__menu-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal size={14} />
          </button>

          {showMenu && (
            <div className="task-item__menu">
              <button
                className="task-item__menu-item"
                onClick={() => {
                  setShowMoveMenu(!showMoveMenu)
                }}
              >
                <ArrowRight size={14} />
                Move to...
              </button>
              <button
                className="task-item__menu-item task-item__menu-item--danger"
                onClick={() => {
                  onDelete(taskId)
                  setShowMenu(false)
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>

              {showMoveMenu && availableLists.length > 0 && (
                <div className="task-item__move-menu">
                  {availableLists.map(list => (
                    <button
                      key={list.id}
                      className="task-item__menu-item"
                      onClick={() => {
                        onMove(taskId, list.id)
                        setShowMenu(false)
                        setShowMoveMenu(false)
                      }}
                    >
                      {list.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes Modal */}
      <NotesModal
        isOpen={showNotesModal}
        notes={task.notes || ''}
        onSave={handleSaveNotes}
        onClose={() => setShowNotesModal(false)}
      />
    </div>
  )
}
