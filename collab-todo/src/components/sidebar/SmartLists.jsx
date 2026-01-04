import { Star, CheckSquare, List } from 'lucide-react'
import { SidebarItem } from './SidebarItem.jsx'
import './sidebar.css'

export function SmartLists({
  selectedView,
  onSelectView,
  priorityCount = 0,
  logbookCount = 0,
  allTasksCount = 0
}) {
  return (
    <div className="smart-lists">
      <SidebarItem
        icon={List}
        label="All Tasks"
        count={allTasksCount}
        selected={selectedView === 'allTasks'}
        onClick={() => onSelectView('allTasks')}
      />
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
