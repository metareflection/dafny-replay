import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const MAX_ENTRIES = 100

/**
 * @typedef {'user_action' | 'dispatch_accepted' | 'dispatch_conflict' | 'dispatch_rejected' | 'realtime_update'} OperationType
 *
 * @typedef {object} OperationLogEntry
 * @property {string} id - Unique ID
 * @property {Date} timestamp
 * @property {OperationType} type
 * @property {string} user - 'you' for local, email/name for remote
 * @property {string} [userColor] - Color for remote users
 * @property {{ type: string, description: string }} [action] - Formatted action
 * @property {string} [projectId] - Project this action belongs to
 * @property {string} [projectName] - Human-readable project name
 * @property {number} [baseVersion] - Version action was based on
 * @property {number} [serverVersion] - Server version at conflict time
 * @property {number} [newVersion] - Resulting version after accept
 * @property {object} [details] - Expandable details
 * @property {string} [details.rebaseReason]
 * @property {string[]} [details.rebasedThrough]
 * @property {number} [details.candidateUsed]
 * @property {number} [details.candidatesTotal]
 * @property {string} [details.rejectionReason]
 * @property {boolean} [details.verified]
 */

const OperationLogContext = createContext(null)

/**
 * @typedef {'all' | 'conflicts' | 'remote'} FilterType
 */

export function OperationLogProvider({ children }) {
  const [entries, setEntries] = useState([])
  const [filter, setFilter] = useState('all')
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('operationLog.isOpen') !== 'false'
  })

  const addEntry = useCallback((entry) => {
    const newEntry = {
      ...entry,
      id: entry.id || crypto.randomUUID(),
      timestamp: entry.timestamp || new Date(),
    }

    setEntries(prev => {
      const updated = [...prev, newEntry]
      // Keep only the last MAX_ENTRIES
      if (updated.length > MAX_ENTRIES) {
        return updated.slice(-MAX_ENTRIES)
      }
      return updated
    })
  }, [])

  const clearEntries = useCallback(() => {
    setEntries([])
  }, [])

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => {
      const newValue = !prev
      localStorage.setItem('operationLog.isOpen', String(newValue))
      return newValue
    })
  }, [])

  const filteredEntries = useMemo(() => {
    switch (filter) {
      case 'conflicts':
        return entries.filter(e =>
          e.type === 'dispatch_conflict' || e.type === 'dispatch_rejected'
        )
      case 'remote':
        return entries.filter(e => e.type === 'realtime_update')
      default:
        return entries
    }
  }, [entries, filter])

  // Stats for the header
  const stats = useMemo(() => {
    const latestVersion = entries.reduce((max, e) => {
      const v = e.newVersion ?? e.serverVersion ?? e.baseVersion ?? 0
      return Math.max(max, v)
    }, 0)

    return {
      totalOps: entries.length,
      latestVersion,
      conflictCount: entries.filter(e =>
        e.type === 'dispatch_conflict' || e.type === 'dispatch_rejected'
      ).length,
    }
  }, [entries])

  const value = {
    entries: filteredEntries,
    allEntries: entries,
    addEntry,
    clearEntries,
    filter,
    setFilter,
    isOpen,
    toggleOpen,
    stats,
  }

  return (
    <OperationLogContext.Provider value={value}>
      {children}
    </OperationLogContext.Provider>
  )
}

export function useOperationLog() {
  const context = useContext(OperationLogContext)
  if (!context) {
    throw new Error('useOperationLog must be used within an OperationLogProvider')
  }
  return context
}

/**
 * Hook to get just the addEntry function (for use in EffectManager)
 * Returns a stable function reference
 */
export function useOperationLogger() {
  const { addEntry } = useOperationLog()
  return addEntry
}
