import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import './members.css'

/**
 * MemberInvite - Form to invite new members by email
 *
 * Props:
 *   onInvite: (email: string) => Promise<void> - Invite a member by email
 *   disabled?: boolean - Disable the form
 */
export function MemberInvite({
  onInvite,
  disabled = false
}) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || loading || disabled) return

    setLoading(true)
    setError(null)

    try {
      await onInvite(email.trim())
      setEmail('')
    } catch (err) {
      setError(err.message || 'Failed to invite member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="member-invite" onSubmit={handleSubmit}>
      <div className="member-invite__input-group">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email to invite..."
          className="member-invite__input"
          disabled={loading || disabled}
        />
        <button
          type="submit"
          className="member-invite__button"
          disabled={!email.trim() || loading || disabled}
          title="Invite member"
        >
          <UserPlus size={14} />
          {loading ? 'Inviting...' : 'Invite'}
        </button>
      </div>
      {error && (
        <div className="member-invite__error">{error}</div>
      )}
    </form>
  )
}
