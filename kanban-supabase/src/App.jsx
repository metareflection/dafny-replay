import { useState, useEffect } from 'react'
import App from './dafny/app.js'
import { supabase, isSupabaseConfigured, signIn, signUp, signInWithGoogle, signOut } from './supabase.js'
import { useProjects, useProjectMembers } from './hooks/useCollaborativeProject.js'
import { useCollaborativeProjectOffline } from './hooks/useCollaborativeProjectOffline.js'
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
// Kanban Components
// ============================================================================

function Card({ id, title, onDragStart, onDragEnd, onEditTitle }) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)

  const handleDoubleClick = () => {
    setEditValue(title)
    setEditing(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editValue.trim() && editValue.trim() !== title) {
      onEditTitle(id, editValue.trim())
    }
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  return (
    <div
      className="card"
      draggable={!editing}
      onDragStart={(e) => onDragStart(e, id)}
      onDragEnd={onDragEnd}
    >
      <div className="card-id">#{id}</div>
      {editing ? (
        <form onSubmit={handleSubmit} className="card-edit-form">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </form>
      ) : (
        <div className="card-title" onDoubleClick={handleDoubleClick}>{title}</div>
      )}
    </div>
  )
}

function Column({ name, cards, wip, model, onAddCard, onMoveCard, onEditTitle }) {
  const [newCardTitle, setNewCardTitle] = useState('')
  const count = cards.length
  const atLimit = wip > 0 && count >= wip

  const handleAddCard = (e) => {
    e.preventDefault()
    if (newCardTitle.trim()) {
      onAddCard(name, newCardTitle.trim())
      setNewCardTitle('')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const cardId = parseInt(e.dataTransfer.getData('cardId'), 10)
    onMoveCard(cardId, name, App.AtEnd())
  }

  return (
    <div
      className="column"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <h3>{name}</h3>
        <span className={`wip-badge ${atLimit ? 'at-limit' : ''}`}>
          {count}/{wip || '∞'}
        </span>
      </div>
      <div className="cards">
        {cards.map((cardId) => (
          <Card
            key={cardId}
            id={cardId}
            title={App.GetCardTitle(model, cardId)}
            onDragStart={(e, id) => {
              e.dataTransfer.setData('cardId', id.toString())
              e.target.classList.add('dragging')
            }}
            onDragEnd={(e) => {
              e.target.classList.remove('dragging')
            }}
            onEditTitle={onEditTitle}
          />
        ))}
      </div>
      {!atLimit && (
        <form className="add-card-form" onSubmit={handleAddCard}>
          <input
            type="text"
            placeholder="New card..."
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
          />
          <button type="submit" disabled={!newCardTitle.trim()}>
            Add
          </button>
        </form>
      )}
    </div>
  )
}

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
      onIsOwnerChange?.(true) // Creator is always owner
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
          {loading ? '...' : '↻'}
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
          {loading ? '...' : '↻'}
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
                ×
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
// Main Kanban Board
// ============================================================================

function KanbanBoard({ user, onSignOut }) {
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColLimit, setNewColLimit] = useState(5)
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

  const handleAddColumn = (e) => {
    e.preventDefault()
    const cols = model ? App.GetCols(model) : []
    if (newColName.trim() && !cols.includes(newColName.trim())) {
      dispatch(App.AddColumn(newColName.trim(), newColLimit))
      setNewColName('')
    }
  }

  const handleAddCard = (col, title) => {
    dispatch(App.AddCard(col, title))
  }

  const handleMoveCard = (cardId, toCol, place) => {
    dispatch(App.MoveCard(cardId, toCol, place))
  }

  const handleEditTitle = (cardId, title) => {
    dispatch(App.EditTitle(cardId, title))
  }

  // Show error as toast
  useEffect(() => {
    if (error) {
      setToast(error)
    }
  }, [error])

  const cols = model ? App.GetCols(model) : []

  return (
    <>
      <div className="header">
        <div>
          <h1>Kanban Supabase</h1>
          <p className="subtitle">Dafny-verified collaboration with Supabase</p>
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
              <form className="add-column-form" onSubmit={handleAddColumn}>
                <input
                  type="text"
                  placeholder="Column name..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="WIP"
                  min="1"
                  value={newColLimit}
                  onChange={(e) => setNewColLimit(parseInt(e.target.value, 10) || 1)}
                />
                <button type="submit" disabled={!newColName.trim() || cols.includes(newColName.trim())}>
                  Add Column
                </button>
              </form>

              {cols.length === 0 ? (
                <div className="empty-board">
                  <p>No columns yet. Add a column to get started!</p>
                </div>
              ) : (
                <div className="board">
                  {cols.map((col) => (
                    <Column
                      key={col}
                      name={col}
                      cards={App.GetLane(model, col)}
                      wip={App.GetWip(model, col)}
                      model={model}
                      onAddCard={handleAddCard}
                      onMoveCard={handleMoveCard}
                      onEditTitle={handleEditTitle}
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
        <h1>Kanban Supabase</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-container">
        <h1>Kanban Supabase</h1>
        <p className="subtitle">Dafny-verified collaboration with Supabase</p>
        <AuthForm />
      </div>
    )
  }

  return <KanbanBoard user={user} onSignOut={handleSignOut} />
}

export default AppContainer
