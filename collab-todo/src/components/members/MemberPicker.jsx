import { useState, useRef, useEffect } from 'react'
import { User, Check } from 'lucide-react'
import './members.css'

/**
 * MemberPicker - Dropdown for assigning/unassigning members to a task
 *
 * Props:
 *   allMembers: [{ user_id, email, role }] - All members in the project
 *   selectedIds: string[] - User IDs currently assigned to the task
 *   onToggle: (userId: string, selected: boolean) => void - Toggle assignment
 *   trigger?: ReactNode - Custom trigger element (default: user icon button)
 */
export function MemberPicker({
  allMembers = [],
  selectedIds = [],
  onToggle,
  trigger
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Filter members by search
  const memberList = allMembers
    .filter(m => m.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.email.localeCompare(b.email))

  const selectedSet = new Set(selectedIds)

  const handleToggle = (userId) => {
    const isSelected = selectedSet.has(userId)
    onToggle(userId, !isSelected)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
    }
  }

  // Get display name (email prefix or first part)
  const getDisplayName = (email) => {
    return email.split('@')[0]
  }

  return (
    <div className="member-picker" ref={containerRef}>
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      ) : (
        <button
          className="member-picker__trigger"
          onClick={() => setIsOpen(!isOpen)}
          title="Assign members"
        >
          <User size={14} />
        </button>
      )}

      {isOpen && (
        <div className="member-picker__dropdown">
          <div className="member-picker__search">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search members..."
              className="member-picker__input"
            />
          </div>

          <div className="member-picker__list">
            {memberList.map(member => (
              <button
                key={member.user_id}
                className={`member-picker__item ${selectedSet.has(member.user_id) ? 'member-picker__item--selected' : ''}`}
                onClick={() => handleToggle(member.user_id)}
              >
                <div className="member-picker__item-info">
                  <span className="member-picker__item-name">{getDisplayName(member.email)}</span>
                  <span className="member-picker__item-email">{member.email}</span>
                </div>
                {selectedSet.has(member.user_id) && <Check size={14} />}
              </button>
            ))}

            {memberList.length === 0 && (
              <div className="member-picker__empty">No members found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
