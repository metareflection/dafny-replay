import { useState, useRef, useEffect } from 'react'
import { Calendar, X } from 'lucide-react'
import './duedate.css'

/**
 * DueDatePicker - Dropdown for setting/clearing due date on a task
 *
 * Props:
 *   currentDate: { year, month, day } | null - Current due date (if any)
 *   onSetDate: (date: { year, month, day } | null) => void - Set or clear date
 *   customTrigger?: ReactNode - Custom trigger element (default: calendar icon button)
 */
export function DueDatePicker({
  currentDate = null,
  onSetDate,
  customTrigger
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Format date for native input (YYYY-MM-DD)
  const formatForInput = (date) => {
    if (!date) return ''
    const y = String(date.year).padStart(4, '0')
    const m = String(date.month).padStart(2, '0')
    const d = String(date.day).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Parse date from native input
  const parseFromInput = (value) => {
    if (!value) return null
    const [year, month, day] = value.split('-').map(Number)
    return { year, month, day }
  }

  const handleDateChange = (e) => {
    const date = parseFromInput(e.target.value)
    if (date) {
      onSetDate(date)
      setIsOpen(false)
    }
  }

  const handleClear = () => {
    onSetDate(null)
    setIsOpen(false)
  }

  const hasDate = currentDate !== null

  return (
    <div className="duedate-picker" ref={containerRef}>
      {customTrigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>{customTrigger}</div>
      ) : (
        <button
          className={`duedate-picker__trigger ${hasDate ? 'duedate-picker__trigger--active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          title={hasDate ? 'Change due date' : 'Set due date'}
        >
          <Calendar size={14} />
        </button>
      )}

      {isOpen && (
        <div className="duedate-picker__dropdown">
          <div className="duedate-picker__header">
            <span className="duedate-picker__title">Due Date</span>
            {hasDate && (
              <button
                className="duedate-picker__clear"
                onClick={handleClear}
                title="Clear due date"
              >
                <X size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>
          <div className="duedate-picker__body">
            <input
              type="date"
              className="duedate-picker__input"
              value={formatForInput(currentDate)}
              onChange={handleDateChange}
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  )
}
