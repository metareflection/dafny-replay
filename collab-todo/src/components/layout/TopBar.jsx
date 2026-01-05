import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import './layout.css'

export function TopBar({
  user,
  onSignOut,
  onSync,
  onToggleOffline,
  isOffline,
  isFlushing,
  status,
  pendingCount
}) {
  return (
    <div className="topbar">
      <div className="topbar__left">
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
          title={isOffline ? 'Go Online' : 'Go Offline'}
        >
          {isOffline ? (
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
