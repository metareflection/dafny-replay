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
  onDeleteProject,
  getProjectMode,

  // Mobile state
  isOpen,
  onClose
}) {
  // Wrap handlers to close sidebar on mobile after selection
  const handleSelectView = (view) => {
    onSelectView(view)
    onClose?.()
  }

  const handleSelectProject = (projectId) => {
    onSelectProject(projectId)
    onClose?.()
  }

  const handleSelectList = (projectId, listId) => {
    onSelectList(projectId, listId)
    onClose?.()
  }

  const handleManageMembers = (projectId) => {
    onManageMembers(projectId)
    onClose?.()
  }

  return (
    <aside className={`sidebar-container ${isOpen ? 'sidebar-container--open' : ''}`}>
      <SmartLists
        selectedView={selectedView}
        onSelectView={handleSelectView}
        priorityCount={priorityCount}
        logbookCount={logbookCount}
        allTasksCount={allTasksCount}
      />

      <ProjectList
        projects={projects}
        selectedProjectId={selectedProjectId}
        selectedListId={selectedListId}
        onSelectProject={handleSelectProject}
        onSelectList={handleSelectList}
        onCreateProject={onCreateProject}
        onAddList={onAddList}
        getProjectLists={getProjectLists}
        getListTaskCount={getListTaskCount}
        loading={projectsLoading}
        onManageMembers={handleManageMembers}
        onDeleteProject={onDeleteProject}
        getProjectMode={getProjectMode}
      />
    </aside>
  )
}
