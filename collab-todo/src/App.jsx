import { useState, useEffect } from 'react'
import App from './dafny/app.js'
import { supabase, isSupabaseConfigured, signIn, signUp, signInWithGoogle, signOut } from './supabase.js'
import { useProjects, useProjectMembers } from './hooks/useCollaborativeProject.js'
import { useCollaborativeProjectOffline } from './hooks/useCollaborativeProjectOffline.js'
import { Check, Star, ArrowRight, X, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import './App.css'

// ============================================================================
// Auth Form Component
// ============================================================================

function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!isSupabaseConfigured()) {
    return (
      <div className="auth-form">
        <h2>Configuration Required</h2>
        <p className="dev-warning">
          Supabase is not configured. Please copy .env.example to .env and fill in your Supabase credentials.
        </p>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>
          See the README for setup instructions.
        </p>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
        setError('Check your email for confirmation link')
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-form">
      <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
      {error && <div className="auth-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>
      <button onClick={handleGoogleSignIn} className="google-btn">
        Sign in with Google
      </button>
      <p className="auth-toggle">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        <button onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
  )
}

// ============================================================================
// Task Item Component
// ============================================================================

function TaskItem({ taskId, task, model, userId, onComplete, onStar, onEdit, onDelete, onMove, lists }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editNotes, setEditNotes] = useState(task.notes)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  const handleSubmitEdit = (e) => {
    e.preventDefault()
    if (editTitle.trim()) {
      onEdit(taskId, editTitle.trim(), editNotes)
    }
    setEditing(false)
  }

  const formatDueDate = (dueDate) => {
    if (!dueDate) return null
    return `${dueDate.year}-${String(dueDate.month).padStart(2, '0')}-${String(dueDate.day).padStart(2, '0')}`
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    const today = new Date()
    const due = new Date(dueDate.year, dueDate.month - 1, dueDate.day)
    return due < today && !task.completed
  }

  return (
    <div className={`task-item ${task.completed ? 'completed' : ''} ${task.starred ? 'starred' : ''}`}>
      <div className="task-main">
        <button
          className={`checkbox ${task.completed ? 'checked' : ''}`}
          onClick={() => onComplete(taskId, !task.completed)}
          title={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed ? <Check size={14} /> : ''}
        </button>

        {editing ? (
          <form onSubmit={handleSubmitEdit} className="task-edit-form">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Task title"
              autoFocus
            />
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Notes..."
              rows={2}
            />
            <div className="task-edit-buttons">
              <button type="submit">Save</button>
              <button type="button" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="task-content" onClick={() => setEditing(true)}>
            <div className="task-title">{task.title}</div>
            {task.notes && <div className="task-notes">{task.notes}</div>}
            {task.dueDate && (
              <div className={`task-due-date ${isOverdue(task.dueDate) ? 'overdue' : ''}`}>
                Due: {formatDueDate(task.dueDate)}
              </div>
            )}
            {task.tags.length > 0 && (
              <div className="task-tags">
                {task.tags.map(tagId => (
                  <span key={tagId} className="task-tag">
                    {App.GetTagName(model, tagId)}
                  </span>
                ))}
              </div>
            )}
            {task.assignees.length > 0 && (
              <div className="task-assignees">
                {task.assignees.map(a => (
                  <span key={a} className="task-assignee" title={a}>
                    {a.slice(0, 8)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="task-actions">
          <button
            className={`star-btn ${task.starred ? 'starred' : ''}`}
            onClick={() => onStar(taskId, !task.starred)}
            title={task.starred ? 'Remove star' : 'Add star'}
          >
            <Star size={16} fill={task.starred ? 'currentColor' : 'none'} />
          </button>

          <div className="move-menu-container">
            <button
              className="move-btn"
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              title="Move to list"
            >
              <ArrowRight size={16} />
            </button>
            {showMoveMenu && (
              <div className="move-menu">
                {lists.map(listId => (
                  <button
                    key={listId}
                    onClick={() => {
                      onMove(taskId, listId)
                      setShowMoveMenu(false)
                    }}
                  >
                    {App.GetListName(model, listId)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="delete-btn"
            onClick={() => onDelete(taskId)}
            title="Delete task"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// List Component
// ============================================================================

function TaskList({ listId, listName, model, userId, dispatch, lists, onRenameList, onDeleteList }) {
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState(listName)
  const [collapsed, setCollapsed] = useState(false)

  const taskIds = App.GetTasksInList(model, listId)
  const tasks = taskIds.map(id => ({ id, ...App.GetTask(model, id) })).filter(t => !t.deleted)

  // Sort: starred first, then by position
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.starred && !b.starred) return -1
    if (!a.starred && b.starred) return 1
    return 0
  })

  const completedCount = tasks.filter(t => t.completed).length
  const totalCount = tasks.length

  const handleAddTask = (e) => {
    e.preventDefault()
    if (newTaskTitle.trim()) {
      dispatch(App.AddTask(listId, newTaskTitle.trim()))
      setNewTaskTitle('')
    }
  }

  const handleRename = (e) => {
    e.preventDefault()
    if (editName.trim() && editName.trim() !== listName) {
      onRenameList(listId, editName.trim())
    }
    setEditingName(false)
  }

  return (
    <div className="task-list">
      <div className="list-header">
        {editingName ? (
          <form onSubmit={handleRename} className="list-rename-form">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              onBlur={handleRename}
            />
          </form>
        ) : (
          <h3 onClick={() => setEditingName(true)}>{listName}</h3>
        )}
        <span className="list-count">{completedCount}/{totalCount}</span>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <button className="delete-list-btn" onClick={() => onDeleteList(listId)} title="Delete list">
          <X size={16} />
        </button>
      </div>

      {!collapsed && (
        <>
          <form className="add-task-form" onSubmit={handleAddTask}>
            <input
              type="text"
              placeholder="Add task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <button type="submit" disabled={!newTaskTitle.trim()}>+</button>
          </form>

          <div className="tasks">
            {sortedTasks.map(task => (
              <TaskItem
                key={task.id}
                taskId={task.id}
                task={task}
                model={model}
                userId={userId}
                lists={lists}
                onComplete={(id, completed) =>
                  dispatch(completed ? App.CompleteTask(id) : App.UncompleteTask(id))
                }
                onStar={(id, starred) =>
                  dispatch(starred ? App.StarTask(id) : App.UnstarTask(id))
                }
                onEdit={(id, title, notes) =>
                  dispatch(App.EditTask(id, title, notes))
                }
                onDelete={(id) =>
                  dispatch(App.DeleteTask(id, userId))
                }
                onMove={(id, toListId) =>
                  dispatch(App.MoveTask(id, toListId, App.AtEnd()))
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Tags Panel
// ============================================================================

function TagsPanel({ model, dispatch }) {
  const [newTagName, setNewTagName] = useState('')
  const tags = App.GetTags(model)
  const tagIds = Object.keys(tags).map(Number)

  const handleCreateTag = (e) => {
    e.preventDefault()
    if (newTagName.trim()) {
      dispatch(App.CreateTag(newTagName.trim()))
      setNewTagName('')
    }
  }

  return (
    <div className="tags-panel">
      <h4>Tags</h4>
      <div className="tags-list">
        {tagIds.map(tagId => (
          <div key={tagId} className="tag-item">
            <span className="tag-name">{tags[tagId].name}</span>
            <button
              className="delete-tag-btn"
              onClick={() => dispatch(App.DeleteTag(tagId))}
              title="Delete tag"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleCreateTag} className="add-tag-form">
        <input
          type="text"
          placeholder="New tag..."
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
        />
        <button type="submit" disabled={!newTagName.trim()}>+</button>
      </form>
    </div>
  )
}

// ============================================================================
// Toast Component
// ============================================================================

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="toast">
      {message}
    </div>
  )
}

// ============================================================================
// Project Selector
// ============================================================================

function ProjectSelector({ currentProjectId, onSelect, onIsOwnerChange }) {
  const { projects, loading, refresh, createProject } = useProjects()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim() || creating) return

    setCreating(true)
    try {
      const projectId = await createProject(newName.trim())
      setNewName('')
      setShowCreate(false)
      onSelect(projectId)
      onIsOwnerChange?.(true)
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="project-selector">
      <div className="project-header">
        <h4>Projects</h4>
        <button onClick={refresh} disabled={loading} className="refresh-btn">
          {loading ? '...' : <RefreshCw size={14} />}
        </button>
      </div>
      <ul className="project-list">
        {projects.map((project) => (
          <li
            key={project.id}
            className={project.id === currentProjectId ? 'selected' : ''}
            onClick={() => {
              onSelect(project.id)
              onIsOwnerChange?.(project.isOwner)
            }}
          >
            <span className="project-name">{project.name}</span>
            {project.isOwner && <span className="owner-badge">owner</span>}
            {!project.isOwner && <span className="member-badge">member</span>}
          </li>
        ))}
      </ul>
      {projects.length === 0 && !loading && (
        <p className="no-projects">No projects yet</p>
      )}
      {showCreate ? (
        <form onSubmit={handleCreate} className="new-project-form">
          <input
            type="text"
            placeholder="Project name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="new-project-buttons">
            <button type="submit" disabled={!newName.trim() || creating}>
              {creating ? '...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="cancel-btn">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowCreate(true)} className="new-project-btn">
          + New Project
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Members Panel
// ============================================================================

function MembersPanel({ projectId, isOwner, currentUserId }) {
  const { members, loading, error, refresh, inviteMember, removeMember } = useProjectMembers(projectId)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState(null)

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim() || inviting) return

    setInviting(true)
    setInviteError(null)
    try {
      await inviteMember(inviteEmail.trim())
      setInviteEmail('')
    } catch (err) {
      setInviteError(err.message)
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (userId) => {
    try {
      await removeMember(userId)
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  if (!projectId) return null

  return (
    <div className="members-panel">
      <div className="members-header">
        <h4>Members</h4>
        <button onClick={refresh} disabled={loading} className="refresh-btn">
          {loading ? '...' : <RefreshCw size={14} />}
        </button>
      </div>
      {error && <div className="members-error">{error}</div>}
      <ul className="members-list">
        {members.map((member) => (
          <li key={member.user_id}>
            <span className="member-email">{member.email}</span>
            {member.role === 'owner' && <span className="owner-badge">owner</span>}
            {isOwner && member.user_id !== currentUserId && member.role !== 'owner' && (
              <button
                className="remove-member-btn"
                onClick={() => handleRemove(member.user_id)}
                title="Remove member"
              >
                <X size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {members.length === 0 && !loading && (
        <p className="no-members">No members</p>
      )}
      {isOwner && (
        <form onSubmit={handleInvite} className="invite-form">
          <input
            type="email"
            placeholder="Email to invite..."
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button type="submit" disabled={!inviteEmail.trim() || inviting}>
            {inviting ? '...' : 'Invite'}
          </button>
          {inviteError && <div className="invite-error">{inviteError}</div>}
        </form>
      )}
    </div>
  )
}

// ============================================================================
// Main Todo Board
// ============================================================================

function TodoBoard({ user, onSignOut }) {
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [toast, setToast] = useState(null)

  const {
    model,
    version,
    dispatch,
    sync,
    pendingCount,
    error,
    status,
    isOffline,
    toggleOffline,
    isFlushing
  } = useCollaborativeProjectOffline(currentProjectId)

  const handleAddList = (e) => {
    e.preventDefault()
    if (newListName.trim()) {
      dispatch(App.AddList(newListName.trim()))
      setNewListName('')
    }
  }

  const handleRenameList = (listId, newName) => {
    dispatch(App.RenameList(listId, newName))
  }

  const handleDeleteList = (listId) => {
    if (confirm('Delete this list? All tasks in it will be permanently deleted.')) {
      dispatch(App.DeleteList(listId))
    }
  }

  // Show error as toast
  useEffect(() => {
    if (error) {
      setToast(error)
    }
  }, [error])

  const lists = model ? App.GetLists(model) : []

  return (
    <>
      <div className="header">
        <div>
          <h1>Todo Collab</h1>
          <p className="subtitle">Dafny-verified collaborative todos</p>
        </div>
        <div className="user-info">
          <span className="user-email">{user.email}</span>
          <button onClick={onSignOut} className="sign-out-btn">Sign Out</button>
        </div>
        <div className="controls">
          <button
            onClick={toggleOffline}
            disabled={isFlushing}
            className={isOffline ? 'offline-btn' : 'online-btn'}
          >
            {isFlushing ? 'Flushing...' : isOffline ? 'Go Online' : 'Go Offline'}
          </button>
          <button onClick={sync} disabled={isOffline || isFlushing || status === 'syncing'}>
            Sync
          </button>
        </div>
      </div>

      <div className="status-bar">
        <span>v{version}</span>
        <span className={`status ${status === 'error' ? 'error' : ''} ${isOffline ? 'offline' : ''}`}>
          {status}
        </span>
        {pendingCount > 0 && (
          <span className="pending-badge">{pendingCount} pending</span>
        )}
        {model && (
          <span className="mode-badge">{App.GetMode(model)}</span>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="main-content">
        <div className="sidebar">
          <ProjectSelector
            currentProjectId={currentProjectId}
            onSelect={setCurrentProjectId}
            onIsOwnerChange={setIsOwner}
          />
          <MembersPanel
            projectId={currentProjectId}
            isOwner={isOwner}
            currentUserId={user.id}
          />
          {model && <TagsPanel model={model} dispatch={dispatch} />}
        </div>

        <div className="board-section">
          {!currentProjectId ? (
            <div className="empty-board">
              <p>Select a project or create a new one to get started.</p>
            </div>
          ) : !model ? (
            <div className="loading">
              <p>Loading project...</p>
            </div>
          ) : (
            <>
              <form className="add-list-form" onSubmit={handleAddList}>
                <input
                  type="text"
                  placeholder="New list name..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
                <button type="submit" disabled={!newListName.trim()}>
                  Add List
                </button>
              </form>

              {lists.length === 0 ? (
                <div className="empty-board">
                  <p>No lists yet. Add a list to get started!</p>
                </div>
              ) : (
                <div className="board">
                  {lists.map((listId) => (
                    <TaskList
                      key={listId}
                      listId={listId}
                      listName={App.GetListName(model, listId)}
                      model={model}
                      userId={user.id}
                      dispatch={dispatch}
                      lists={lists}
                      onRenameList={handleRenameList}
                      onDeleteList={handleDeleteList}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <p className="info">
        Dafny-verified domain invariants and offline support.
        <br />
        Actions queue locally while offline, flush on reconnect.
        <br />
        created with &lt;3 with <a href="https://github.com/metareflection/dafny-replay" target="_blank" rel="noopener noreferrer">dafny-replay</a>
      </p>
    </>
  )
}

// ============================================================================
// App Container
// ============================================================================

function AppContainer() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return (
      <div className="loading">
        <h1>Todo Collab</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-container">
        <h1>Todo Collab</h1>
        <p className="subtitle">Dafny-verified collaborative todos</p>
        <AuthForm />
      </div>
    )
  }

  return <TodoBoard user={user} onSignOut={handleSignOut} />
}

export default AppContainer
