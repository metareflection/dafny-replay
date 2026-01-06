import { useEffect } from 'react'
import { X } from 'lucide-react'
import './common.css'

export function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [onClose, duration])

  return (
    <div className={`toast toast--${type}`}>
      <span className="toast__message">{message}</span>
      <button className="toast__close" onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  )
}
