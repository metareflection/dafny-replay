import { useState } from 'react'
import { Plus, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import './layout.css'

export function TopBar({
  user,
  onSignOut,
  onSync,
  onToggleOffline,
  isOffline,
  isFlushing,
  status,
  pendingCount,
  onAddList,
  showAddList = true
}) {
  const [newListName, setNewListName] = useState('')

  const handleAddList = (e) => {
    e.preventDefault()
    if (newListName.trim()) {
      onAddList(newListName.trim())
      setNewListName('')
    }
  }

  return (
    <div className="topbar">
      <div className="topbar__left">
        {showAddList && (
          <form className="topbar__add-form" onSubmit={handleAddList}>
            <button type="button" className="topbar__add-btn" onClick={handleAddList}>
              <Plus size={16} />
            </button>
            <input
              type="text"
              placeholder="New List"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="topbar__add-input"
            />
          </form>
        )}
      </div>

      <div className="topbar__center">
        {pendingCount > 0 && (
          <span className="topbar__pending">{pendingCount} pending</span>
        )}
        {status === 'syncing' && (
          <span className="topbar__status topbar__status--syncing">Syncing...</span>
        )}
        {status === 'error' && (
          <span className="topbar__status topbar__status--error">Error</span>
        )}
      </div>

      <div className="topbar__right">
        <button
          className={`topbar__network-btn ${isOffline ? 'topbar__network-btn--offline' : ''}`}
          onClick={onToggleOffline}
          disabled={isFlushing}
          title={isOffline ? 'Go Online' : 'Go Offline'}
        >
          {isFlushing ? (
            <RefreshCw size={16} className="topbar__spinner" />
          ) : isOffline ? (
            <WifiOff size={16} />
          ) : (
            <Wifi size={16} />
          )}
        </button>

        <button
          className="topbar__sync-btn"
          onClick={onSync}
          disabled={isOffline || isFlushing || status === 'syncing'}
          title="Sync"
        >
          <RefreshCw size={16} />
        </button>

        <div className="topbar__user">
          <span className="topbar__email">{user?.email}</span>
          <button className="topbar__signout" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
