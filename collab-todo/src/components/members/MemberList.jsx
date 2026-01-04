import { X, Crown } from 'lucide-react'
import './members.css'

/**
 * MemberList - Display list of project members with remove option
 *
 * Props:
 *   members: Array<{ user_id, email, role }> - Members to display
 *   ownerId: string - User ID of the project owner
 *   onRemoveMember?: (userId: string) => void - Remove a member (optional)
 *   canManage: boolean - Whether current user can manage members
 */
export function MemberList({
  members = [],
  ownerId,
  onRemoveMember,
  canManage = false
}) {
  if (members.length === 0) {
    return (
      <div className="member-list member-list--empty">
        No members yet
      </div>
    )
  }

  return (
    <div className="member-list">
      {members.map(member => {
        const isOwner = member.user_id === ownerId
        const canRemove = canManage && !isOwner && onRemoveMember

        return (
          <div
            key={member.user_id}
            className={`member-list__item ${isOwner ? 'member-list__item--owner' : ''}`}
          >
            <div className="member-list__info">
              <span className="member-list__email">{member.email}</span>
              {isOwner && (
                <span className="member-list__badge">
                  <Crown size={12} />
                  Owner
                </span>
              )}
            </div>

            {canRemove && (
              <button
                className="member-list__remove"
                onClick={() => onRemoveMember(member.user_id)}
                title="Remove member"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
