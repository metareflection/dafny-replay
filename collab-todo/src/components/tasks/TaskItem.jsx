import { useState } from 'react'
import { Check, Star, MoreHorizontal, ArrowRight, Trash2 } from 'lucide-react'
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

  return (
    <div className={`task-item ${task.completed ? 'task-item--completed' : ''}`}>
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
            <div className="task-item__title">{task.title}</div>
            {task.notes && (
              <div className="task-item__notes">{task.notes}</div>
            )}
            {((showProject && projectName) || task.dueDate || (task.tags && task.tags.length > 0) || (task.assignees && task.assignees.length > 0)) && (
              <div className="task-item__meta">
                {showProject && projectName && (
                  <span className="task-item__project">{projectName}</span>
                )}
                {task.dueDate && (
                  <span className={`task-item__due ${isOverdue(task.dueDate) ? 'task-item__due--overdue' : ''}`}>
                    {formatDueDate(task.dueDate)}
                  </span>
                )}
                {task.tags && task.tags.length > 0 && (
                  <TagList
                    tagIds={task.tags}
                    allTags={allTags}
                    compact={true}
                    maxVisible={2}
                  />
                )}
                {task.assignees && task.assignees.length > 0 && (
                  <AssigneeList
                    assigneeIds={task.assignees}
                    allMembers={allMembers}
                    compact={true}
                    maxVisible={2}
                  />
                )}
              </div>
            )}
          </div>

          <div className="task-item__actions">
            {onAddTag && (
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
              />
            )}

            {onSetDueDate && (
              <DueDatePicker
                currentDate={task.dueDate}
                onSetDate={(date) => onSetDueDate(taskId, date)}
              />
            )}

            {onAssign && allMembers.length > 0 && (
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
              />
            )}

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
