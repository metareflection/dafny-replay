import { ArrowLeft, Users, UserPlus } from 'lucide-react'
import { MemberList } from './MemberList.jsx'
import { MemberInvite } from './MemberInvite.jsx'
import './members.css'

/**
 * MemberManagement - Full view for managing project collaboration
 *
 * Props:
 *   projectName: string - Name of the project
 *   projectMode: 'Personal' | 'Collaborative' - Current mode
 *   members: Array<{ user_id, email, role }> - Members to display
 *   ownerId: string - User ID of the project owner
 *   isOwner: boolean - Whether current user is the owner
 *   onMakeCollaborative: () => void - Convert to collaborative
 *   onInviteMember: (email: string) => Promise<void> - Invite a member
 *   onRemoveMember: (userId: string) => void - Remove a member
 *   onBack: () => void - Go back to project view
 */
export function MemberManagement({
  projectName,
  projectMode,
  members = [],
  ownerId,
  isOwner,
  onMakeCollaborative,
  onInviteMember,
  onRemoveMember,
  onBack
}) {
  const isPersonal = projectMode === 'Personal'

  return (
    <div className="member-management">
      <div className="member-management__header">
        <button
          className="member-management__back-btn"
          onClick={onBack}
          title="Back to project"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="member-management__title-group">
          <h2 className="member-management__title">
            {isPersonal ? 'Make Collaborative' : 'Manage Members'}
          </h2>
          <span className="member-management__project-name">{projectName}</span>
        </div>
      </div>

      {isPersonal ? (
        <div className="member-management__personal">
          <div className="member-management__icon-container">
            <UserPlus size={32} />
          </div>
          <h3 className="member-management__subtitle">
            Enable Collaboration
          </h3>
          <p className="member-management__description">
            Convert this personal project to a collaborative project to invite team members.
            Once converted, you can invite others by email to view and edit tasks.
          </p>
          {isOwner && (
            <button
              className="member-management__action-btn"
              onClick={onMakeCollaborative}
            >
              <Users size={16} />
              Make Collaborative
            </button>
          )}
        </div>
      ) : (
        <div className="member-management__collaborative">
          <div className="member-management__section">
            <div className="member-management__section-header">
              <Users size={16} />
              <span>Members ({members.length})</span>
            </div>
            <MemberList
              members={members}
              ownerId={ownerId}
              onRemoveMember={onRemoveMember}
              canManage={isOwner}
            />
          </div>

          {isOwner && (
            <div className="member-management__section">
              <div className="member-management__section-header">
                <UserPlus size={16} />
                <span>Invite Member</span>
              </div>
              <MemberInvite onInvite={onInviteMember} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

