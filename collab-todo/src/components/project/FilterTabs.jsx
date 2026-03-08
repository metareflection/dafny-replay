import { Plus, Download, Upload } from 'lucide-react'
import './project.css'

export function FilterTabs({
  tabs = [
    { id: 'all', label: 'All' },
    { id: 'important', label: 'Important' }
  ],
  activeTab,
  onTabChange,
  onAddList,
  onExportProject,
  onImportProject
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
      <div className="filter-tabs__actions">
        {onExportProject && (
          <button className="filter-tabs__action-btn" onClick={onExportProject} title="Export project as markdown">
            <Download size={13} />
          </button>
        )}
        {onImportProject && (
          <button className="filter-tabs__action-btn" onClick={onImportProject} title="Import lists from markdown">
            <Upload size={13} />
          </button>
        )}
        {onAddList && (
          <button className="filter-tabs__add-list" onClick={onAddList}>
            <Plus size={14} />
            <span>Add List</span>
          </button>
        )}
      </div>
    </div>
  )
}
