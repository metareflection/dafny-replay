import { MoreHorizontal } from 'lucide-react'
import './project.css'

export function FilterTabs({
  tabs = [
    { id: 'all', label: 'All' },
    { id: 'important', label: 'Important' }
  ],
  activeTab,
  onTabChange
}) {
  return (
    <div className="filter-tabs">
      <div className="filter-tabs__list">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`filter-tabs__tab ${activeTab === tab.id ? 'filter-tabs__tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button className="filter-tabs__more">
        <MoreHorizontal size={16} />
      </button>
    </div>
  )
}
