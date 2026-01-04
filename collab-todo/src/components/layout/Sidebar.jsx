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
  onAddList,
  projectsLoading,

  // Data accessors
  getProjectLists,
  getListTaskCount,

  // Counts for smart lists
  priorityCount,
  logbookCount,
  allTasksCount,

  // Member management
  onManageMembers,
  getProjectMode
}) {
  return (
    <aside className="sidebar-container">
      <SmartLists
        selectedView={selectedView}
        onSelectView={onSelectView}
        priorityCount={priorityCount}
        logbookCount={logbookCount}
        allTasksCount={allTasksCount}
      />

      <ProjectList
        projects={projects}
        selectedProjectId={selectedProjectId}
        selectedListId={selectedListId}
        onSelectProject={onSelectProject}
        onSelectList={onSelectList}
        onCreateProject={onCreateProject}
        onAddList={onAddList}
        getProjectLists={getProjectLists}
        getListTaskCount={getListTaskCount}
        loading={projectsLoading}
        onManageMembers={onManageMembers}
        getProjectMode={getProjectMode}
      />
    </aside>
  )
}
