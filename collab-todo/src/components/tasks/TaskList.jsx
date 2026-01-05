import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, X, Edit2, Plus, ArrowUp, ArrowDown, Send } from 'lucide-react'
import { TaskItem } from './TaskItem.jsx'
import './tasks.css'

export function TaskList({
  listId,
  listName,
  tasks,
  projectName,
  showProject = false,
  collapsed = false,
  onToggleCollapse,
  onAddTask,
  onRenameList,
  onDeleteList,
  onMoveList,
  allLists = [],
  onCompleteTask,
  onStarTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  availableLists = [],
  showListHeader = true,
  showAddTask = true,
  allTags = {},
  onAddTag,
  onRemoveTag,
  onCreateTag,
  onSetDueDate,
  otherProjects = [],
  onMoveListToProject
}) {
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState(listName)
  const [showAddInput, setShowAddInput] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [showMoveDropdown, setShowMoveDropdown] = useState(false)
  const moveDropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moveDropdownRef.current && !moveDropdownRef.current.contains(e.target)) {
        setShowMoveDropdown(false)
      }
    }
    if (showMoveDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoveDropdown])

  const completedCount = tasks.filter(t => t.completed).length
  const totalCount = tasks.length

  const handleRename = (e) => {
    e.preventDefault()
    if (editName.trim() && editName.trim() !== listName) {
      onRenameList?.(listId, editName.trim())
    }
    setEditingName(false)
  }

  const handleAddTask = (e) => {
    e.preventDefault()
    if (newTaskTitle.trim()) {
      onAddTask?.(listId, newTaskTitle.trim())
      setNewTaskTitle('')
      setShowAddInput(false)
    }
  }

  // Sort: starred first, then incomplete, then completed
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (a.starred !== b.starred) return a.starred ? -1 : 1
    return 0
  })

  return (
    <div className="task-list">
      {showListHeader && (
        <div className="task-list__header">
          <button
            className="task-list__collapse-btn"
            onClick={onToggleCollapse}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>

          {editingName ? (
            <form className="task-list__rename-form" onSubmit={handleRename}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRename}
                autoFocus
              />
            </form>
          ) : (
            <h3
              className="task-list__name"
              onClick={() => setEditingName(true)}
            >
              {listName}
            </h3>
          )}

          <div className="task-list__spacer" />

          <div className="task-list__actions">
            {showAddTask && (
              <button
                className="task-list__action-btn task-list__action-btn--add"
                onClick={() => setShowAddInput(true)}
                title="Add task"
              >
                <Plus size={14} />
              </button>
            )}
            {onMoveList && allLists.length > 1 && (() => {
              const idx = allLists.findIndex(l => l.id === listId)
              return (
                <>
                  <button
                    className="task-list__action-btn"
                    onClick={() => onMoveList(listId, allLists[idx - 1]?.id, 'before')}
                    title="Move up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    className="task-list__action-btn"
                    onClick={() => onMoveList(listId, allLists[idx + 1]?.id, 'after')}
                    title="Move down"
                  >
                    <ArrowDown size={12} />
                  </button>
                </>
              )
            })()}
            {onMoveListToProject && otherProjects.length > 0 && (
              <div className="task-list__move-dropdown" ref={moveDropdownRef}>
                <button
                  className="task-list__action-btn"
                  onClick={() => setShowMoveDropdown(!showMoveDropdown)}
                  title="Move list to another project"
                >
                  <Send size={12} />
                </button>
                {showMoveDropdown && (
                  <div className="task-list__move-menu">
                    <div className="task-list__move-menu-title">Move to project:</div>
                    {otherProjects.map(project => (
                      <button
                        key={project.id}
                        className="task-list__move-menu-item"
                        onClick={() => {
                          onMoveListToProject(listId, project.id)
                          setShowMoveDropdown(false)
                        }}
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              className="task-list__action-btn"
              onClick={() => setEditingName(true)}
              title="Rename list"
            >
              <Edit2 size={12} />
            </button>
            <button
              className="task-list__action-btn task-list__action-btn--danger"
              onClick={() => onDeleteList?.(listId)}
              title="Delete list"
            >
              <X size={12} />
            </button>
          </div>

          <span className="task-list__count">{completedCount}/{totalCount}</span>
        </div>
      )}

      {!collapsed && (
        <div className="task-list__content">
          {showAddInput && (
            <form className="task-list__add-form" onSubmit={handleAddTask}>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title..."
                autoFocus
                onBlur={() => {
                  if (!newTaskTitle.trim()) setShowAddInput(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setNewTaskTitle('')
                    setShowAddInput(false)
                  }
                }}
              />
            </form>
          )}

          <div className="task-list__items">
            {sortedTasks.map(task => (
              <TaskItem
                key={task.id}
                taskId={task.id}
                task={task}
                projectName={projectName}
                showProject={showProject}
                onComplete={onCompleteTask}
                onStar={onStarTask}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onMove={onMoveTask}
                availableLists={availableLists}
                allTags={allTags}
                onAddTag={onAddTag}
                onRemoveTag={onRemoveTag}
                onCreateTag={onCreateTag}
                onSetDueDate={onSetDueDate}
              />
            ))}
          </div>

          {sortedTasks.length === 0 && (
            <div className="task-list__empty">No tasks</div>
          )}
        </div>
      )}
    </div>
  )
}
