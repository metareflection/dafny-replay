import { useEffect, useState } from 'react'
import { Undo2 } from 'lucide-react'
import './common.css'

export function UndoToast({ message, onUndo, onClose, duration = 5000 }) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining === 0) {
        clearInterval(interval)
        onClose()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration, onClose])

  const handleUndo = () => {
    onUndo()
    onClose()
  }

  return (
    <div className="undo-toast">
      <span className="undo-toast__message">{message}</span>
      <button className="undo-toast__button" onClick={handleUndo}>
        <Undo2 size={14} />
        Undo
      </button>
      <div className="undo-toast__progress" style={{ width: `${progress}%` }} />
    </div>
  )
}
