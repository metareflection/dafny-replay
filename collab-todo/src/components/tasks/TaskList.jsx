import { useState } from 'react'
import { ChevronDown, ChevronRight, X, Edit2, Plus } from 'lucide-react'
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
  onCompleteTask,
  onStarTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  availableLists = [],
  showListHeader = true,
  showAddTask = true
}) {
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState(listName)
  const [showAddInput, setShowAddInput] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

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

          <span className="task-list__count">{completedCount}/{totalCount}</span>

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
