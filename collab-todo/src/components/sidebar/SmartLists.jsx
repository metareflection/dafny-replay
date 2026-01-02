import { Star, CheckSquare } from 'lucide-react'
import { SidebarItem } from './SidebarItem.jsx'
import './sidebar.css'

export function SmartLists({
  selectedView,
  onSelectView,
  priorityCount = 0,
  logbookCount = 0
}) {
  return (
    <div className="smart-lists">
      <SidebarItem
        icon={Star}
        label="Priority"
        count={priorityCount}
        selected={selectedView === 'priority'}
        onClick={() => onSelectView('priority')}
      />
      <SidebarItem
        icon={CheckSquare}
        label="Logbook"
        count={logbookCount}
        selected={selectedView === 'logbook'}
        onClick={() => onSelectView('logbook')}
      />
    </div>
  )
}
