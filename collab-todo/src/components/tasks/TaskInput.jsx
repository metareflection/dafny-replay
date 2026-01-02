import { useState } from 'react'
import { Plus } from 'lucide-react'
import './tasks.css'

export function TaskInput({ onSubmit, placeholder = 'Add task...' }) {
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value.trim()) {
      onSubmit(value.trim())
      setValue('')
    }
  }

  return (
    <form className="task-input" onSubmit={handleSubmit}>
      <button type="submit" className="task-input__btn" disabled={!value.trim()}>
        <Plus size={14} />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="task-input__field"
      />
    </form>
  )
}
