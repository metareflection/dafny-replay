import { useState, useEffect, useCallback } from 'react'
import App from './dafny/app-extras.js'
import './App.css'

const API_BASE = '/api'

function Card({ id, title, onDragStart, onDragEnd, onDragOver, onDragLeave, onEditTitle, dropPosition }) {
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

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const position = e.clientY < midpoint ? 'before' : 'after'
    onDragOver(id, position)
  }

  return (
    <div
      className={`card ${dropPosition === 'before' ? 'drop-before' : ''} ${dropPosition === 'after' ? 'drop-after' : ''}`}
      draggable={!editing}
      onDragStart={(e) => onDragStart(e, id)}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
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
  const [dropTarget, setDropTarget] = useState(null) // { cardId, position: 'before' | 'after' }
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

    let place
    if (dropTarget) {
      if (dropTarget.position === 'before') {
        place = App.Before(dropTarget.cardId)
      } else {
        place = App.After(dropTarget.cardId)
      }
    } else {
      place = App.AtEnd()
    }

    onMoveCard(cardId, name, place)
    setDropTarget(null)
  }

  const handleCardDragOver = (cardId, position) => {
    setDropTarget({ cardId, position })
  }

  const handleCardDragLeave = () => {
    // Don't clear immediately - let dragover on another card set new target
  }

  const handleColumnDragLeave = (e) => {
    // Only clear if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null)
    }
  }

  return (
    <div
      className="column"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleColumnDragLeave}
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
              setDropTarget(null)
            }}
            onDragOver={handleCardDragOver}
            onDragLeave={handleCardDragLeave}
            onEditTitle={onEditTitle}
            dropPosition={dropTarget?.cardId === cardId ? dropTarget.position : null}
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

function KanbanBoard() {
  const [client, setClient] = useState(null)
  const [serverVersion, setServerVersion] = useState(0)
  const [status, setStatus] = useState('syncing...')
  const [error, setError] = useState(null)
  const [newColName, setNewColName] = useState('')
  const [newColLimit, setNewColLimit] = useState(5)
  const [toast, setToast] = useState(null)
  const [isOffline, setIsOffline] = useState(false)
  const [isFlushing, setIsFlushing] = useState(false)

  // Sync with server
  const sync = useCallback(async () => {
    try {
      setStatus('syncing...')
      const res = await fetch(`${API_BASE}/sync`)
      const data = await res.json()
      setServerVersion(data.version)
      const newClient = App.InitClient(data.version, data.model)
      setClient(newClient)
      setStatus('synced')
      setError(null)
    } catch (e) {
      setStatus('error')
      setError('Failed to sync with server')
    }
  }, [])

  // Initial sync
  useEffect(() => {
    sync()
  }, [sync])

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
      const res = await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseVersion,
          action: App.actionToJson(action)
        })
      })
      const data = await res.json()

      if (data.status === 'accepted') {
        setServerVersion(data.version)
        // Re-sync to get authoritative state (includes server-allocated IDs)
        const syncClient = App.InitClient(data.version, data.model)
        setClient(syncClient)
        setStatus('synced')
        setError(null)
      } else {
        setStatus('rejected')
        // Show toast for rejected action
        const actionJson = App.actionToJson(action)
        setToast(`Action rejected: ${actionJson.type}${actionJson.title ? ` "${actionJson.title}"` : ''}`)
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
        const res = await fetch(`${API_BASE}/dispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseVersion,
            action: App.actionToJson(action)
          })
        })
        const data = await res.json()

        if (data.status === 'accepted') {
          setServerVersion(data.version)
          // Update client to new server state, with remaining pending actions
          // We rebuild with empty pending since we're processing them sequentially
          currentClient = App.InitClient(data.version, data.model)
          acceptedCount++
        } else {
          // Action rejected - sync to server state and continue with remaining
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
      // Going online - flush pending actions
      setIsOffline(false)
      await flush()
    } else {
      // Going offline
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

  // v2: AddCard only needs col and title; server allocates ID
  const handleAddCard = (col, title) => {
    dispatch(App.AddCard(col, title))
  }

  // v2: MoveCard uses Place (AtEnd, Before, After) instead of position
  const handleMoveCard = (cardId, toCol, place) => {
    dispatch(App.MoveCard(cardId, toCol, place))
  }

  // Edit card title
  const handleEditTitle = (cardId, title) => {
    dispatch(App.EditTitle(cardId, title))
  }

  if (!client) {
    return (
      <div className="loading">
        <h1>Kanban Multi-Collaboration</h1>
        <p>Loading...</p>
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
          <h1>Kanban Multi-Collaboration</h1>
          <p className="subtitle">Anchor-based moves, server-allocated IDs, candidate fallback</p>
        </div>
        <div className="controls">
          <button
            onClick={toggleOffline}
            disabled={isFlushing}
            className={isOffline ? 'offline-btn' : 'online-btn'}
          >
            {isFlushing ? 'Flushing...' : isOffline ? 'Go Online' : 'Go Offline'}
          </button>
          <button onClick={sync} disabled={isOffline || isFlushing}>Sync</button>
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

      <p className="info">
        Server-allocated card IDs, anchor-based placement (AtEnd, Before, After).
        <br />
        Stale anchors automatically fall back to AtEnd via candidate selection.
      </p>
    </>
  )
}

export default KanbanBoard
