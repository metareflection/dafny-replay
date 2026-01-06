import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import './notes.css'

/**
 * Modal for editing task notes
 *
 * Props:
 *   isOpen: boolean - Whether modal is visible
 *   notes: string - Current notes content
 *   onSave: (notes: string) => void - Save handler
 *   onClose: () => void - Close handler
 */
export function NotesModal({
  isOpen,
  notes = '',
  onSave,
  onClose
}) {
  const [editNotes, setEditNotes] = useState(notes)

  // Sync with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditNotes(notes)
    }
  }, [isOpen, notes])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSave = () => {
    onSave(editNotes)
    onClose()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="notes-modal__backdrop" onClick={handleBackdropClick}>
      <div className="notes-modal">
        <div className="notes-modal__header">
          <h3 className="notes-modal__title">Notes</h3>
          <button className="notes-modal__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="notes-modal__content">
          <textarea
            className="notes-modal__textarea"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Add notes..."
            autoFocus
            rows={6}
          />
        </div>
        <div className="notes-modal__actions">
          <button className="notes-modal__btn notes-modal__btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="notes-modal__btn notes-modal__btn--primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
