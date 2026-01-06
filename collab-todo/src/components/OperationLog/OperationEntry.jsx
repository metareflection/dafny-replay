import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Check,
  RefreshCw,
  X,
  ArrowDown
} from 'lucide-react'

/**
 * Get icon and color for entry type
 */
function getEntryStyle(type) {
  switch (type) {
    case 'user_action':
      return {
        icon: ArrowRight,
        color: 'var(--color-accent)',
        bgColor: 'var(--color-accent-light)',
        label: 'Local'
      }
    case 'dispatch_accepted':
      return {
        icon: Check,
        color: 'var(--color-success, #22c55e)',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        label: 'Accepted'
      }
    case 'dispatch_conflict':
      return {
        icon: RefreshCw,
        color: 'var(--color-warning, #f59e0b)',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        label: 'Rebasing'
      }
    case 'dispatch_rejected':
      return {
        icon: X,
        color: 'var(--color-error, #ef4444)',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        label: 'Rejected'
      }
    case 'realtime_update':
      return {
        icon: ArrowDown,
        color: 'var(--color-purple, #a855f7)',
        bgColor: 'rgba(168, 85, 247, 0.1)',
        label: 'Remote'
      }
    default:
      return {
        icon: ArrowRight,
        color: 'var(--color-text-muted)',
        bgColor: 'var(--color-bg-secondary)',
        label: type
      }
  }
}

/**
 * Format timestamp as HH:MM:SS.mmm
 */
function formatTimestamp(date) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

export function OperationEntry({ entry }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasDetails = entry.details && Object.keys(entry.details).length > 0

  const style = getEntryStyle(entry.type)
  const Icon = style.icon

  const versionDisplay = (() => {
    if (entry.baseVersion != null && entry.newVersion != null) {
      return `v${entry.baseVersion} → v${entry.newVersion}`
    }
    if (entry.baseVersion != null && entry.serverVersion != null) {
      return `v${entry.baseVersion} ↔ v${entry.serverVersion}`
    }
    if (entry.newVersion != null) {
      return `→ v${entry.newVersion}`
    }
    if (entry.baseVersion != null) {
      return `v${entry.baseVersion}`
    }
    return ''
  })()

  return (
    <div
      className={`operation-entry operation-entry--${entry.type}`}
      style={{ '--entry-color': style.color, '--entry-bg': style.bgColor }}
    >
      <div
        className="operation-entry__main"
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        style={{ cursor: hasDetails ? 'pointer' : 'default' }}
      >
        {/* Expand arrow (only if has details) */}
        <span className="operation-entry__expand">
          {hasDetails ? (
            isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span style={{ width: 12, display: 'inline-block' }} />
          )}
        </span>

        {/* Type icon */}
        <span
          className="operation-entry__icon"
          title={style.label}
        >
          <Icon size={12} />
        </span>

        {/* Timestamp */}
        <span className="operation-entry__timestamp">
          {formatTimestamp(entry.timestamp)}
        </span>

        {/* User */}
        <span
          className={`operation-entry__user ${entry.user === 'you' ? 'operation-entry__user--you' : 'operation-entry__user--remote'}`}
          style={entry.userColor ? { color: entry.userColor } : {}}
        >
          {entry.user}
        </span>

        {/* Action description */}
        <span className="operation-entry__description">
          {entry.action?.description || entry.type}
        </span>

        {/* Version */}
        {versionDisplay && (
          <span className="operation-entry__version">
            {versionDisplay}
          </span>
        )}

        {/* Status badge */}
        <span
          className="operation-entry__badge"
          style={{ backgroundColor: style.bgColor, color: style.color }}
        >
          {style.label}
        </span>
      </div>

      {/* Expandable details */}
      {isExpanded && entry.details && (
        <div className="operation-entry__details">
          {entry.details.rebaseReason && (
            <div className="operation-entry__detail-row">
              <span className="operation-entry__detail-arrow">↳</span>
              {entry.details.rebaseReason}
            </div>
          )}
          {entry.details.rebasedThrough && entry.details.rebasedThrough.length > 0 && (
            <div className="operation-entry__detail-row">
              <span className="operation-entry__detail-arrow">↳</span>
              Rebased through: {entry.details.rebasedThrough.join(', ')}
            </div>
          )}
          {entry.details.candidateUsed != null && entry.details.candidatesTotal != null && (
            <div className="operation-entry__detail-row">
              <span className="operation-entry__detail-arrow">↳</span>
              Candidate {entry.details.candidateUsed}/{entry.details.candidatesTotal} succeeded
            </div>
          )}
          {entry.details.rejectionReason && (
            <div className="operation-entry__detail-row">
              <span className="operation-entry__detail-arrow">↳</span>
              Reason: {entry.details.rejectionReason}
            </div>
          )}
          {entry.details.verified && (
            <div className="operation-entry__detail-row operation-entry__detail-row--verified">
              <span className="operation-entry__detail-arrow">↳</span>
              Invariant verified <Check size={12} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
