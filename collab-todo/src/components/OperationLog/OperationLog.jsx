import { useRef, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useOperationLog } from '../../contexts/OperationLogContext'
import { OperationEntry } from './OperationEntry'
import './operationLog.css'

export function OperationLog({ isOnline = true }) {
  const {
    entries,
    allEntries,
    clearEntries,
    filter,
    setFilter,
    isOpen,
    toggleOpen,
    stats,
  } = useOperationLog()

  const scrollRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom when new entries arrive (if enabled)
  useEffect(() => {
    if (autoScroll && scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries, autoScroll, isOpen])

  // Detect when user scrolls up (disable auto-scroll)
  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setAutoScroll(isAtBottom)
  }

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'conflicts', label: 'Conflicts' },
    { key: 'remote', label: 'Remote' },
  ]

  return (
    <div className={`operation-log ${isOpen ? 'operation-log--open' : 'operation-log--closed'}`}>
      {/* Header bar (always visible) */}
      <div className="operation-log__header" onClick={toggleOpen}>
        <div className="operation-log__header-left">
          <span className="operation-log__toggle">
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </span>
          <span className="operation-log__title">
            Operation Log
          </span>
          <span className="operation-log__subtitle">
            verified state transitions
          </span>
        </div>

        <div className="operation-log__header-right">
          <span
            className={`operation-log__status ${isOnline ? 'operation-log__status--online' : 'operation-log__status--offline'}`}
            title={isOnline ? 'Online' : 'Offline'}
          />
          {stats.latestVersion > 0 && (
            <span className="operation-log__version">
              v{stats.latestVersion}
            </span>
          )}
          <span className="operation-log__count">
            {allEntries.length} ops
          </span>

          {/* Filter tabs (only when open) */}
          {isOpen && (
            <div className="operation-log__filters" onClick={e => e.stopPropagation()}>
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  className={`operation-log__filter-btn ${filter === tab.key ? 'operation-log__filter-btn--active' : ''}`}
                  onClick={() => setFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Clear button (only when open) */}
          {isOpen && allEntries.length > 0 && (
            <button
              className="operation-log__clear-btn"
              onClick={(e) => {
                e.stopPropagation()
                clearEntries()
              }}
              title="Clear log"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Log entries (only when open) */}
      {isOpen && (
        <div
          className="operation-log__body"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {entries.length === 0 ? (
            <div className="operation-log__empty">
              {allEntries.length === 0
                ? 'No operations yet. Perform an action to see it logged here.'
                : `No ${filter === 'conflicts' ? 'conflicts' : 'remote updates'} to show.`
              }
            </div>
          ) : (
            entries.map(entry => (
              <OperationEntry key={entry.id} entry={entry} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
