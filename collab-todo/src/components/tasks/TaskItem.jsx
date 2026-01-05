import { useState } from 'react'
import { Check, Star, MoreHorizontal, ArrowRight, Trash2, Calendar, Tag, User } from 'lucide-react'
import { TagList, TagPicker } from '../tags'
import { DueDatePicker } from '../duedate'
import { MemberPicker, AssigneeList } from '../members'
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
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editNotes, setEditNotes] = useState(task.notes || '')
  const [showMenu, setShowMenu] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  const handleSubmitEdit = (e) => {
    e.preventDefault()
    if (editTitle.trim()) {
      onEdit(taskId, editTitle.trim(), editNotes)
    }
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditing(false)
      setEditTitle(task.title)
      setEditNotes(task.notes || '')
    }
  }

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

  const hasDueDate = !!task.dueDate
  const hasTags = task.tags && task.tags.length > 0
  const hasAssignees = task.assignees && task.assignees.length > 0

  return (
    <div className={`task-item ${task.completed ? 'task-item--completed' : ''} ${task.starred ? 'task-item--starred' : ''}`}>
      <button
        className={`task-item__checkbox ${task.completed ? 'task-item__checkbox--checked' : ''}`}
        onClick={() => onComplete(taskId, !task.completed)}
      >
        {task.completed && <Check size={12} />}
      </button>

      {editing ? (
        <form className="task-item__edit-form" onSubmit={handleSubmitEdit}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="task-item__edit-title"
          />
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Notes..."
            className="task-item__edit-notes"
            rows={2}
          />
          <div className="task-item__edit-actions">
            <button type="submit" className="task-item__edit-save">Save</button>
            <button
              type="button"
              className="task-item__edit-cancel"
              onClick={() => {
                setEditing(false)
                setEditTitle(task.title)
                setEditNotes(task.notes || '')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="task-item__content" onClick={() => setEditing(true)}>
            <div className="task-item__title-row">
              <span className="task-item__title">{task.title}</span>
              {showProject && projectName && (
                <span className="task-item__project">{projectName}</span>
              )}
            </div>
            {task.notes && (
              <div className="task-item__notes">{task.notes}</div>
            )}
          </div>

          {/* Meta indicators - collapsed shows only set, hover expands all */}
          <div className="task-item__indicators">
            {onSetDueDate && (
              <div className={`task-item__indicator-wrapper task-item__indicator-wrapper--date ${hasDueDate ? 'task-item__indicator-wrapper--set' : ''}`}>
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
              </div>
            )}
            {onAddTag && (
              <div className={`task-item__indicator-wrapper task-item__indicator-wrapper--tags ${hasTags ? 'task-item__indicator-wrapper--set' : ''}`}>
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
              </div>
            )}
            {onAssign && allMembers.length > 0 && (
              <div className={`task-item__indicator-wrapper task-item__indicator-wrapper--assignees ${hasAssignees ? 'task-item__indicator-wrapper--set' : ''}`}>
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
              </div>
            )}
          </div>

          <div className="task-item__actions">
            <button
              className={`task-item__star ${task.starred ? 'task-item__star--active' : ''}`}
              onClick={() => onStar(taskId, !task.starred)}
              title={task.starred ? 'Remove from Priority' : 'Add to Priority'}
            >
              <Star size={14} fill={task.starred ? 'currentColor' : 'none'} />
            </button>

            <div className="task-item__menu-container">
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
        </>
      )}
    </div>
  )
}
