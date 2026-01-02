import { SmartLists, ProjectList } from '../sidebar'
import './layout.css'

export function Sidebar({
  // View state
  selectedView,
  onSelectView,

  // Project state
  projects,
  selectedProjectId,
  selectedListId,
  onSelectProject,
  onSelectList,
  onCreateProject,
  projectsLoading,

  // Data accessors
  getProjectLists,
  getListTaskCount,

  // Counts for smart lists
  priorityCount,
  logbookCount,

  // View mode toggle
  viewMode,
  onToggleViewMode
}) {
  return (
    <aside className="sidebar-container">
      <div className="sidebar-container__view-toggle">
        <button
          className={`sidebar-container__toggle-btn ${viewMode === 'single' ? 'active' : ''}`}
          onClick={() => onToggleViewMode('single')}
        >
          Single
        </button>
        <button
          className={`sidebar-container__toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
          onClick={() => onToggleViewMode('all')}
        >
          All
        </button>
      </div>

      <SmartLists
        selectedView={selectedView}
        onSelectView={onSelectView}
        priorityCount={priorityCount}
        logbookCount={logbookCount}
      />

      <ProjectList
        projects={projects}
        selectedProjectId={selectedProjectId}
        selectedListId={selectedListId}
        onSelectProject={onSelectProject}
        onSelectList={onSelectList}
        onCreateProject={onCreateProject}
        getProjectLists={getProjectLists}
        getListTaskCount={getListTaskCount}
        loading={projectsLoading}
      />
    </aside>
  )
}
