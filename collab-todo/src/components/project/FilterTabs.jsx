import { Plus } from 'lucide-react'
import './project.css'

export function FilterTabs({
  tabs = [
    { id: 'all', label: 'All' },
    { id: 'important', label: 'Important' }
  ],
  activeTab,
  onTabChange,
  onAddList
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
      {onAddList && (
        <button className="filter-tabs__add-list" onClick={onAddList}>
          <Plus size={14} />
          <span>Add List</span>
        </button>
      )}
    </div>
  )
}
