import { useState, useEffect, useCallback } from 'react'
import App from './dafny/app.js'
import { supabase, isSupabaseConfigured, signIn, signUp, signInWithGoogle, signOut, getAccessToken } from './supabase.js'
import './App.css'

const API_BASE = '/api'

// Get auth headers for API requests
const getAuthHeaders = async (devUserId = null) => {
  if (isSupabaseConfigured()) {
    const token = await getAccessToken();
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  } else {
    // Dev mode: use X-User-Id header
    if (devUserId) {
      return { 'X-User-Id': devUserId };
    }
    return {};
  }
};

function AuthForm({ onDevLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

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

  // Dev mode login
  if (!isSupabaseConfigured()) {
    return (
      <div className="auth-form">
        <h2>Development Mode Login</h2>
        <p className="dev-warning">Supabase not configured. Using X-User-Id header.</p>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (email.trim()) onDevLogin(email.trim())
        }}>
          <input
            type="text"
            placeholder="Enter user ID (e.g., owner@example.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={!email.trim()}>Login</button>
        </form>
      </div>
    )
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

function ProjectSelector({ projects, currentProjectId, onSelect, onRefresh, onCreate, loading }) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim() || creating) return

    setCreating(true)
    try {
      await onCreate(newName.trim())
      setNewName('')
      setShowCreate(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="project-selector">
      <div className="project-header">
        <h4>Projects</h4>
        <button onClick={onRefresh} disabled={loading} className="refresh-btn">
          {loading ? '...' : '↻'}
        </button>
      </div>
      <ul className="project-list">
        {projects.map((project) => (
          <li
            key={project.id}
            className={project.id === currentProjectId ? 'selected' : ''}
            onClick={() => onSelect(project.id)}
          >
            <span className="project-name">{project.name}</span>
            {project.is_owner && <span className="owner-badge">owner</span>}
            {!project.is_owner && <span className="member-badge">member</span>}
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

function MemberList({ members, owner, currentUser, onInvite, onRemove }) {
  const [newMember, setNewMember] = useState('')

  const handleInvite = (e) => {
    e.preventDefault()
    if (newMember.trim()) {
      onInvite(newMember.trim())
      setNewMember('')
    }
  }

  const isOwner = currentUser === owner

  return (
    <div className="member-list">
      <h4>Members</h4>
      <ul>
        {members.map((member) => (
          <li key={member} className={member === owner ? 'owner' : ''}>
            {member}
            {member === owner && <span className="owner-badge">owner</span>}
            {member === currentUser && <span className="you-badge">you</span>}
            {isOwner && member !== owner && (
              <button onClick={() => onRemove(member)} className="remove-btn">
                remove
              </button>
            )}
          </li>
        ))}
      </ul>
      {isOwner && (
        <form onSubmit={handleInvite} className="invite-form">
          <input
            type="text"
            placeholder="Invite member (email)..."
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
          />
          <button type="submit" disabled={!newMember.trim()}>Invite</button>
        </form>
      )}
    </div>
  )
}

function KanbanBoard({ user, onSignOut, devUserId }) {
  const [client, setClient] = useState(null)
  const [serverVersion, setServerVersion] = useState(0)
  const [status, setStatus] = useState('syncing...')
  const [error, setError] = useState(null)
  const [newColName, setNewColName] = useState('')
  const [newColLimit, setNewColLimit] = useState(5)
  const [toast, setToast] = useState(null)
  const [isOffline, setIsOffline] = useState(false)
  const [isFlushing, setIsFlushing] = useState(false)
  const [modelInfo, setModelInfo] = useState({ owner: '', members: [] })
  const [projects, setProjects] = useState([])
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [loadingProjects, setLoadingProjects] = useState(false)

  // Fetch projects list
  const fetchProjects = useCallback(async () => {
    try {
      setLoadingProjects(true)
      const authHeaders = await getAuthHeaders(devUserId)
      const res = await fetch(`${API_BASE}/projects`, {
        headers: authHeaders
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch projects')
      }
      const data = await res.json()
      setProjects(data.projects)
    } catch (e) {
      console.error('Failed to fetch projects:', e.message)
    } finally {
      setLoadingProjects(false)
    }
  }, [devUserId])

  // Sync with server
  const sync = useCallback(async (projectId = currentProjectId) => {
    try {
      setStatus('syncing...')
      const authHeaders = await getAuthHeaders(devUserId)
      const url = projectId
        ? `${API_BASE}/sync?projectId=${encodeURIComponent(projectId)}`
        : `${API_BASE}/sync`
      const res = await fetch(url, {
        headers: authHeaders
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to sync')
      }
      const data = await res.json()
      setServerVersion(data.version)
      setCurrentProjectId(data.projectId)
      const newClient = App.InitClient(data.version, data.model)
      setClient(newClient)
      setModelInfo({ owner: data.model.owner, members: data.model.members })
      setStatus('synced')
      setError(null)
      // Refresh projects list to include any new project
      await fetchProjects()
    } catch (e) {
      setStatus('error')
      setError(e.message || 'Failed to sync with server')
    }
  }, [devUserId, currentProjectId, fetchProjects])

  // Initial sync and fetch projects
  useEffect(() => {
    sync()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Switch to a different project
  const selectProject = async (projectId) => {
    if (projectId === currentProjectId) return
    setClient(null)
    await sync(projectId)
  }

  // Create a new project
  const createNewProject = async (name) => {
    try {
      const authHeaders = await getAuthHeaders(devUserId)
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ name })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create project')
      }
      const data = await res.json()
      // Switch to the new project
      await sync(data.projectId)
      setToast(`Created project "${name}"`)
    } catch (e) {
      setToast(`Error: ${e.message}`)
    }
  }

  // Dispatch action to server and update client
  const dispatch = async (action) => {
    if (!client) return

    // Optimistic local update (queues action in pending)
    const newClient = App.LocalDispatch(client, action)
    setClient(newClient)

    // If offline, just keep the optimistic update
    if (isOffline) {
      setStatus('offline')
      return
    }

    setStatus('pending...')

    // Send to server
    try {
      const baseVersion = App.GetBaseVersion(client)
      const authHeaders = await getAuthHeaders(devUserId)
      const res = await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          baseVersion,
          action: App.actionToJson(action),
          projectId: currentProjectId
        })
      })
      const data = await res.json()

      if (data.status === 'accepted') {
        setServerVersion(data.version)
        // Re-sync to get authoritative state (includes server-allocated IDs)
        const syncClient = App.InitClient(data.version, data.model)
        setClient(syncClient)
        setModelInfo({ owner: data.model.owner, members: data.model.members })
        setStatus('synced')
        setError(null)
      } else {
        setStatus('rejected')
        // Show toast for rejected action
        const actionJson = App.actionToJson(action)
        const reason = data.reason || 'Unknown'
        setToast(`Action rejected (${reason}): ${actionJson.type}${actionJson.title ? ` "${actionJson.title}"` : ''}`)
        // Re-sync to recover
        await sync()
      }
    } catch (e) {
      setStatus('error')
      setError('Failed to dispatch action')
      // Re-sync to recover
      await sync()
    }
  }

  // Flush pending actions to server (when going back online)
  const flush = async () => {
    if (!client) return

    const pendingActions = App.GetPendingActions(client)
    if (pendingActions.length === 0) {
      setStatus('synced')
      return
    }

    setIsFlushing(true)
    setStatus('flushing...')

    let currentClient = client
    let acceptedCount = 0
    let rejectedCount = 0

    for (const action of pendingActions) {
      try {
        const baseVersion = App.GetBaseVersion(currentClient)
        const authHeaders = await getAuthHeaders(devUserId)
        const res = await fetch(`${API_BASE}/dispatch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            baseVersion,
            action: App.actionToJson(action),
            projectId: currentProjectId
          })
        })
        const data = await res.json()

        if (data.status === 'accepted') {
          setServerVersion(data.version)
          currentClient = App.InitClient(data.version, data.model)
          acceptedCount++
        } else {
          rejectedCount++
          const actionJson = App.actionToJson(action)
          setToast(`Action rejected: ${actionJson.type}${actionJson.title ? ` "${actionJson.title}"` : ''}`)
        }
      } catch (e) {
        setError('Failed to flush action')
        break
      }
    }

    // Final sync to get clean state
    await sync()
    setIsFlushing(false)

    if (rejectedCount > 0) {
      setToast(`Flushed: ${acceptedCount} accepted, ${rejectedCount} rejected`)
    }
  }

  // Toggle offline mode
  const toggleOffline = async () => {
    if (isOffline) {
      setIsOffline(false)
      await flush()
    } else {
      setIsOffline(true)
      setStatus('offline')
    }
  }

  const handleAddColumn = (e) => {
    e.preventDefault()
    const model = client ? App.GetPresent(client) : null
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

  // Membership actions (these need to be sent as special action types)
  const handleInviteMember = async (userEmail) => {
    try {
      const baseVersion = serverVersion
      const authHeaders = await getAuthHeaders(devUserId)
      const res = await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          baseVersion,
          action: { type: 'InviteMember', user: userEmail },
          projectId: currentProjectId
        })
      })
      const data = await res.json()

      if (data.status === 'accepted') {
        setServerVersion(data.version)
        setModelInfo({ owner: data.model.owner, members: data.model.members })
        setToast(`Invited ${userEmail}`)
      } else {
        setToast(`Failed to invite ${userEmail}: ${data.reason}`)
      }
    } catch (e) {
      setToast(`Error inviting ${userEmail}`)
    }
  }

  const handleRemoveMember = async (userEmail) => {
    try {
      const baseVersion = serverVersion
      const authHeaders = await getAuthHeaders(devUserId)
      const res = await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          baseVersion,
          action: { type: 'RemoveMember', user: userEmail },
          projectId: currentProjectId
        })
      })
      const data = await res.json()

      if (data.status === 'accepted') {
        setServerVersion(data.version)
        setModelInfo({ owner: data.model.owner, members: data.model.members })
        setToast(`Removed ${userEmail}`)
      } else {
        setToast(`Failed to remove ${userEmail}: ${data.reason}`)
      }
    } catch (e) {
      setToast(`Error removing ${userEmail}`)
    }
  }

  const currentUserId = user?.email || devUserId

  if (!client) {
    return (
      <div className="loading">
        <h1>Kanban Multi-User</h1>
        <p>Loading...</p>
        {error && <div className="error-banner">{error}</div>}
      </div>
    )
  }

  const model = App.GetPresent(client)
  const cols = App.GetCols(model)
  const pendingCount = App.GetPendingCount(client)

  return (
    <>
      <div className="header">
        <div>
          <h1>Kanban Multi-User</h1>
          <p className="subtitle">Verified authorization with Dafny</p>
        </div>
        <div className="user-info">
          <span className="user-email">{currentUserId}</span>
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
          <button onClick={() => sync()} disabled={isOffline || isFlushing}>Sync</button>
        </div>
      </div>

      <div className="status-bar">
        <span>v{serverVersion}</span>
        <span className={`status ${error ? 'error' : ''} ${isOffline ? 'offline' : ''}`}>
          {status}
        </span>
        {pendingCount > 0 && (
          <span className="pending-badge">{pendingCount} pending</span>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="main-content">
        <div className="sidebar">
          <ProjectSelector
            projects={projects}
            currentProjectId={currentProjectId}
            onSelect={selectProject}
            onRefresh={fetchProjects}
            onCreate={createNewProject}
            loading={loadingProjects}
          />
          <MemberList
            members={modelInfo.members}
            owner={modelInfo.owner}
            currentUser={currentUserId}
            onInvite={handleInviteMember}
            onRemove={handleRemoveMember}
          />
        </div>

        <div className="board-section">
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
        </div>
      </div>

      <p className="info">
        Verified authorization: only members can edit, only owner can manage members.
      </p>
    </>
  )
}

function AppContainer() {
  const [user, setUser] = useState(null)
  const [devUserId, setDevUserId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Dev mode: no auth needed initially
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
    if (isSupabaseConfigured()) {
      await signOut()
    } else {
      setDevUserId(null)
    }
  }

  const handleDevLogin = (userId) => {
    setDevUserId(userId)
  }

  if (loading) {
    return (
      <div className="loading">
        <h1>Kanban Multi-User</h1>
        <p>Loading...</p>
      </div>
    )
  }

  // Show auth form if not logged in
  if (!user && !devUserId) {
    return (
      <div className="auth-container">
        <h1>Kanban Multi-User</h1>
        <p className="subtitle">Verified authorization with Dafny</p>
        <AuthForm onDevLogin={handleDevLogin} />
      </div>
    )
  }

  return <KanbanBoard user={user} onSignOut={handleSignOut} devUserId={devUserId} />
}

export default AppContainer
