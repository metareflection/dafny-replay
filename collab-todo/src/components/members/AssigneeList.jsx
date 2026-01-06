import './members.css'

/**
 * AssigneeList - Display assignees on a task as compact badges
 *
 * Props:
 *   assigneeIds: string[] - User IDs assigned to the task
 *   allMembers: [{ user_id, email }] - All members (for email lookup)
 *   compact: boolean - Show compact view (default: true)
 *   maxVisible: number - Max badges to show before overflow (default: 2)
 */
export function AssigneeList({
  assigneeIds = [],
  allMembers = [],
  compact = true,
  maxVisible = 2
}) {
  if (assigneeIds.length === 0) return null

  // Create lookup map for member emails
  const memberMap = {}
  for (const m of allMembers) {
    memberMap[m.user_id] = m.email
  }

  // Get display name from email
  const getDisplayName = (userId) => {
    const email = memberMap[userId]
    if (!email) return userId.slice(0, 8)
    return email.split('@')[0]
  }

  const visibleAssignees = compact ? assigneeIds.slice(0, maxVisible) : assigneeIds
  const overflow = assigneeIds.length - visibleAssignees.length

  return (
    <div className="assignee-list">
      {visibleAssignees.map(userId => (
        <span key={userId} className="assignee-badge">
          {getDisplayName(userId)}
        </span>
      ))}
      {overflow > 0 && (
        <span className="assignee-list__overflow">+{overflow}</span>
      )}
    </div>
  )
}
