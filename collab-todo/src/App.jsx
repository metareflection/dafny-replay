import { useState, useEffect, useMemo, useCallback } from 'react'
import { Star, CheckSquare, Circle } from 'lucide-react'
import { supabase, isSupabaseConfigured, signOut } from './supabase.js'
import { useProjects, useProjectMembers } from './hooks/useCollaborativeProject.js'
import { useAllProjects } from './hooks/useAllProjects.js'
import App from './dafny/app-extras.js'

// Components
import { AuthForm } from './components/auth'
import { Toast } from './components/common'
import { TopBar, Sidebar, MainContent, EmptyState, LoadingState } from './components/layout'
import { TaskList, TaskItem } from './components/tasks'
import { ProjectHeader, FilterTabs } from './components/project'
import { MemberManagement } from './components/members'

// Styles
import './styles/global.css'
import './components/layout/layout.css'

// ============================================================================
// Smart List Views
// ============================================================================

function PriorityView({ tasks, onCompleteTask, onStarTask, onEditTask, onDeleteTask, onMoveTask, getAvailableLists, getProjectTags, onAddTag, onRemoveTag, onCreateTag }) {
  if (tasks.length === 0) {
    return <EmptyState icon={Star} message="No priority tasks. Star a task to add it here." />
  }

  return (
    <div className="project-view">
      <ProjectHeader
        title="Priority"
        icon={Star}
        showNotes={false}
      />
      <div className="project-view__section">
        {tasks.map(task => (
          <TaskItem
            key={`${task.projectId}-${task.id}`}
            taskId={task.id}
            task={task}
            projectName={task.listName}
            showProject={true}
            onComplete={(id, completed) => onCompleteTask(task.projectId, id, completed)}
            onStar={(id, starred) => onStarTask(task.projectId, id, starred)}
            onEdit={(id, title, notes) => onEditTask(task.projectId, id, title, notes)}
            onDelete={(id) => onDeleteTask(task.projectId, id)}
            onMove={(id, listId) => onMoveTask(task.projectId, id, listId)}
            availableLists={getAvailableLists(task.projectId)}
            allTags={getProjectTags(task.projectId)}
            onAddTag={(id, tagId) => onAddTag(task.projectId, id, tagId)}
            onRemoveTag={(id, tagId) => onRemoveTag(task.projectId, id, tagId)}
            onCreateTag={(name) => onCreateTag(task.projectId, name)}
          />
        ))}
      </div>
    </div>
  )
}

function LogbookView({ tasks, onCompleteTask, onStarTask, getProjectTags }) {
  if (tasks.length === 0) {
    return <EmptyState icon={CheckSquare} message="No completed tasks yet." />
  }

  return (
    <div className="project-view">
      <ProjectHeader
        title="Logbook"
        icon={CheckSquare}
        showNotes={false}
      />
      <div className="project-view__section">
        {tasks.map(task => (
          <TaskItem
            key={`${task.projectId}-${task.id}`}
            taskId={task.id}
            task={task}
            projectName={task.listName}
            showProject={true}
            onComplete={(id, completed) => onCompleteTask(task.projectId, id, completed)}
            onStar={(id, starred) => onStarTask(task.projectId, id, starred)}
            onEdit={() => {}}
            onDelete={() => {}}
            onMove={() => {}}
            availableLists={[]}
            allTags={getProjectTags(task.projectId)}
          />
        ))}
      </div>
    </div>
  )
}

function AllTasksView({ tasks, onCompleteTask, onStarTask, onEditTask, onDeleteTask, onMoveTask, getAvailableLists, getProjectTags, onAddTag, onRemoveTag, onCreateTag }) {
  if (tasks.length === 0) {
    return <EmptyState icon={Circle} message="No tasks yet. Create a task in a project to see it here." />
  }

  return (
    <div className="project-view">
      <ProjectHeader
        title="All Tasks"
        icon={Circle}
        showNotes={false}
      />
      <div className="project-view__section">
        {tasks.map(task => (
          <TaskItem
            key={`${task.projectId}-${task.id}`}
            taskId={task.id}
            task={task}
            projectName={task.listName}
            showProject={true}
            onComplete={(id, completed) => onCompleteTask(task.projectId, id, completed)}
            onStar={(id, starred) => onStarTask(task.projectId, id, starred)}
            onEdit={(id, title, notes) => onEditTask(task.projectId, id, title, notes)}
            onDelete={(id) => onDeleteTask(task.projectId, id)}
            onMove={(id, listId) => onMoveTask(task.projectId, id, listId)}
            availableLists={getAvailableLists(task.projectId)}
            allTags={getProjectTags(task.projectId)}
            onAddTag={(id, tagId) => onAddTag(task.projectId, id, tagId)}
            onRemoveTag={(id, tagId) => onRemoveTag(task.projectId, id, tagId)}
            onCreateTag={(name) => onCreateTag(task.projectId, name)}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Project View
// ============================================================================

function ProjectView({
  project,
  model,
  userId,
  dispatch,
  filterTab,
  onFilterChange,
  onRenameList,
  onDeleteList,
  onMoveList,
  otherProjects,
  onMoveListToProject
}) {
  const [collapsedLists, setCollapsedLists] = useState(new Set())

  const lists = useMemo(() => {
    if (!model) return []
    return App.GetLists(model).map(id => ({
      id,
      name: App.GetListName(model, id)
    }))
  }, [model])

  const allTags = useMemo(() => {
    if (!model) return {}
    return App.GetAllTags(model)
  }, [model])

  const getTasksForList = useCallback((listId) => {
    if (!model) return []
    const taskIds = App.GetTasksInList(model, listId)
    return taskIds
      .map(id => ({ id, ...App.GetTask(model, id) }))
      .filter(t => !t.deleted)
      .filter(t => {
        if (filterTab === 'logbook') return t.completed
        if (filterTab === 'important') return t.starred && !t.completed
        return !t.completed // 'all' tab shows incomplete tasks
      })
  }, [model, filterTab])

  const toggleCollapse = (listId) => {
    setCollapsedLists(prev => {
      const next = new Set(prev)
      if (next.has(listId)) {
        next.delete(listId)
      } else {
        next.add(listId)
      }
      return next
    })
  }

  if (!model) {
    return <LoadingState message="Loading project..." />
  }

  return (
    <div className="project-view">
      <ProjectHeader
        title={project.name}
        icon={Circle}
        subtitle={project.isOwner ? 'Owner' : 'Member'}
        showNotes={false}
      />

      <FilterTabs
        tabs={[
          { id: 'all', label: 'All' },
          { id: 'important', label: 'Priority' },
          { id: 'logbook', label: 'Logbook' }
        ]}
        activeTab={filterTab}
        onTabChange={onFilterChange}
      />

      {lists.length === 0 ? (
        <EmptyState message="No lists yet. Click the + on the project in the sidebar." />
      ) : (
        lists.map(list => (
          <TaskList
            key={list.id}
            listId={list.id}
            listName={list.name}
            tasks={getTasksForList(list.id)}
            collapsed={collapsedLists.has(list.id)}
            onToggleCollapse={() => toggleCollapse(list.id)}
            onAddTask={(listId, title) => dispatch(App.AddTask(listId, title))}
            onRenameList={onRenameList}
            onDeleteList={onDeleteList}
            onMoveList={onMoveList}
            allLists={lists}
            otherProjects={otherProjects}
            onMoveListToProject={onMoveListToProject}
            onCompleteTask={(taskId, completed) =>
              dispatch(completed ? App.CompleteTask(taskId) : App.UncompleteTask(taskId))
            }
            onStarTask={(taskId, starred) =>
              dispatch(starred ? App.StarTask(taskId) : App.UnstarTask(taskId))
            }
            onEditTask={(taskId, title, notes) =>
              dispatch(App.EditTask(taskId, title, notes))
            }
            onDeleteTask={(taskId) =>
              dispatch(App.DeleteTask(taskId, userId))
            }
            onMoveTask={(taskId, toListId) =>
              dispatch(App.MoveTask(taskId, toListId, App.AtEnd()))
            }
            availableLists={lists}
            allTags={allTags}
            onAddTag={(taskId, tagId) =>
              dispatch(App.AddTagToTask(taskId, tagId))
            }
            onRemoveTag={(taskId, tagId) =>
              dispatch(App.RemoveTagFromTask(taskId, tagId))
            }
            onCreateTag={(name) =>
              dispatch(App.CreateTag(name))
            }
          />
        ))
      )}
    </div>
  )
}

// ============================================================================
// Main Todo App
// ============================================================================

function TodoApp({ user, onSignOut }) {
  // View state
  const [selectedView, setSelectedView] = useState(null) // 'priority' | 'logbook' | 'allTasks' | null
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [selectedListId, setSelectedListId] = useState(null)
  const [filterTab, setFilterTab] = useState('all')
  const [toast, setToast] = useState(null)
  const [showMemberManagement, setShowMemberManagement] = useState(false)

  // Projects list
  const { projects, loading: projectsLoading, createProject, refresh: refreshProjects } = useProjects()

  // Unified multi-project state (single source of truth)
  const projectIds = useMemo(() => projects.map(p => p.id), [projects])
  const {
    createDispatch,
    priorityTasks,
    logbookTasks,
    allTasks,
    getProjectModel,
    getProjectLists,
    getListTaskCount,
    moveListToProject,
    refresh: sync,
    error,
    status,
    isOffline,
    toggleOffline,
    pendingCount,
    hasPending: isFlushing
  } = useAllProjects(projectIds)

  // Restore selected project from localStorage on mount
  useEffect(() => {
    if (projects.length === 0) return
    const savedId = localStorage.getItem('collab-todo:selectedProjectId')
    if (savedId && projects.find(p => p.id === savedId)) {
      setSelectedProjectId(savedId)
    }
  }, [projects])

  // Save selected project to localStorage
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('collab-todo:selectedProjectId', selectedProjectId)
    }
  }, [selectedProjectId])

  // Derive single-project model from unified state
  const singleModel = selectedProjectId ? getProjectModel(selectedProjectId) : null
  const singleDispatch = useMemo(
    () => selectedProjectId ? createDispatch(selectedProjectId) : () => {},
    [selectedProjectId, createDispatch]
  )

  // Project members (for selected project)
  const {
    members,
    inviteMember,
    removeMember: removeFromSupabase,
    refresh: refreshMembers
  } = useProjectMembers(selectedProjectId)

  // Get project mode and owner from model
  const projectMode = singleModel ? App.GetMode(singleModel) : null
  const projectOwner = singleModel ? App.GetOwner(singleModel) : null

  // Show errors as toast
  useEffect(() => {
    if (error) {
      setToast({ message: error, type: 'error' })
    }
  }, [error])

  // Handlers
  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId)
    setSelectedListId(null)
    setSelectedView(null)
    setShowMemberManagement(false)
  }

  const handleSelectList = (projectId, listId) => {
    setSelectedProjectId(projectId)
    setSelectedListId(listId)
    setSelectedView(null)
    setShowMemberManagement(false)
  }

  const handleSelectView = (view) => {
    setSelectedView(view)
    // Keep selectedProjectId for filtering in single mode
    setSelectedListId(null)
    setShowMemberManagement(false)
  }

  const handleManageMembers = (projectId) => {
    setSelectedProjectId(projectId)
    setSelectedView(null)
    setSelectedListId(null)
    setShowMemberManagement(true)
  }

  const handleAddList = (name) => {
    if (selectedProjectId) {
      singleDispatch(App.AddList(name))
    }
  }

  const handleRenameList = (listId, newName) => {
    if (selectedProjectId) {
      singleDispatch(App.RenameList(listId, newName))
    }
  }

  const handleDeleteList = (listId) => {
    if (selectedProjectId && confirm('Delete this list? All tasks in it will be permanently deleted.')) {
      singleDispatch(App.DeleteList(listId))
    }
  }

  const handleMoveList = (listId, anchorId, direction) => {
    const listPlace = direction === 'before' ? App.ListBefore(anchorId) : App.ListAfter(anchorId)
    singleDispatch(App.MoveList(listId, listPlace))
  }

  const handleMoveListToProject = (listId, targetProjectId) => {
    if (selectedProjectId) {
      moveListToProject(selectedProjectId, targetProjectId, listId)
    }
  }

  // Member handlers
  const handleMakeCollaborative = () => {
    singleDispatch(App.MakeCollaborative())
  }

  const handleInviteMember = async (email) => {
    // First add to Supabase project_members (for access control)
    // inviteMember looks up userId by email and inserts into project_members
    await inviteMember(email)
    // Then update domain model
    // Note: inviteMember returns the userId after successful insert
    // We need to get the userId to dispatch the domain action
    // For now, refresh members to sync - the domain model will be updated on next sync
    await refreshMembers()
  }

  const handleRemoveMember = async (userId) => {
    // First update domain model (clears task assignments)
    singleDispatch(App.RemoveMember(userId))
    // Then remove from Supabase project_members
    await removeFromSupabase(userId)
    await refreshMembers()
  }

  const handleCreateProject = async (name) => {
    const projectId = await createProject(name)
    setSelectedProjectId(projectId)
    setSelectedView(null)
    return projectId
  }

  // Task handlers for all-projects mode
  const handleCompleteTaskAll = (projectId, taskId, completed) => {
    const dispatch = createDispatch(projectId)
    dispatch(completed ? App.CompleteTask(taskId) : App.UncompleteTask(taskId))
  }

  const handleStarTaskAll = (projectId, taskId, starred) => {
    const dispatch = createDispatch(projectId)
    dispatch(starred ? App.StarTask(taskId) : App.UnstarTask(taskId))
  }

  const handleEditTaskAll = (projectId, taskId, title, notes) => {
    const dispatch = createDispatch(projectId)
    dispatch(App.EditTask(taskId, title, notes))
  }

  const handleDeleteTaskAll = (projectId, taskId) => {
    const dispatch = createDispatch(projectId)
    dispatch(App.DeleteTask(taskId, user.id))
  }

  const handleMoveTaskAll = (projectId, taskId, listId) => {
    const dispatch = createDispatch(projectId)
    dispatch(App.MoveTask(taskId, listId, App.AtEnd()))
  }

  const handleAddTagAll = (projectId, taskId, tagId) => {
    const dispatch = createDispatch(projectId)
    dispatch(App.AddTagToTask(taskId, tagId))
  }

  const handleRemoveTagAll = (projectId, taskId, tagId) => {
    const dispatch = createDispatch(projectId)
    dispatch(App.RemoveTagFromTask(taskId, tagId))
  }

  const handleCreateTagAll = (projectId, name) => {
    const dispatch = createDispatch(projectId)
    dispatch(App.CreateTag(name))
  }

  const getProjectTags = useCallback((projectId) => {
    const model = getProjectModel(projectId)
    if (!model) return {}
    return App.GetAllTags(model)
  }, [getProjectModel])

  // Count calculations for sidebar (smart lists always show all projects)
  const priorityCount = priorityTasks.length
  const logbookCount = logbookTasks.length
  const allTasksCount = allTasks.length

  // Get project mode for sidebar
  const getProjectMode = useCallback((projectId) => {
    const model = getProjectModel(projectId)
    if (!model) return null
    return App.GetMode(model)
  }, [getProjectModel])

  // Render main content
  const renderContent = () => {
    // Member management view
    if (showMemberManagement && selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId)
      if (!project) return <EmptyState message="Project not found" />

      return (
        <MemberManagement
          projectName={project.name}
          projectMode={projectMode}
          members={members}
          ownerId={projectOwner}
          isOwner={project.isOwner}
          onMakeCollaborative={handleMakeCollaborative}
          onInviteMember={handleInviteMember}
          onRemoveMember={handleRemoveMember}
          onBack={() => setShowMemberManagement(false)}
        />
      )
    }

    // Smart list views (always show all projects)
    if (selectedView === 'allTasks') {
      return (
        <AllTasksView
          tasks={allTasks}
          onCompleteTask={handleCompleteTaskAll}
          onStarTask={handleStarTaskAll}
          onEditTask={handleEditTaskAll}
          onDeleteTask={handleDeleteTaskAll}
          onMoveTask={handleMoveTaskAll}
          getAvailableLists={getProjectLists}
          getProjectTags={getProjectTags}
          onAddTag={handleAddTagAll}
          onRemoveTag={handleRemoveTagAll}
          onCreateTag={handleCreateTagAll}
        />
      )
    }

    if (selectedView === 'priority') {
      return (
        <PriorityView
          tasks={priorityTasks}
          onCompleteTask={handleCompleteTaskAll}
          onStarTask={handleStarTaskAll}
          onEditTask={handleEditTaskAll}
          onDeleteTask={handleDeleteTaskAll}
          onMoveTask={handleMoveTaskAll}
          getAvailableLists={getProjectLists}
          getProjectTags={getProjectTags}
          onAddTag={handleAddTagAll}
          onRemoveTag={handleRemoveTagAll}
          onCreateTag={handleCreateTagAll}
        />
      )
    }

    if (selectedView === 'logbook') {
      return (
        <LogbookView
          tasks={logbookTasks}
          onCompleteTask={handleCompleteTaskAll}
          onStarTask={handleStarTaskAll}
          getProjectTags={getProjectTags}
        />
      )
    }

    // Project view
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId)
      if (!project) return <EmptyState message="Project not found" />

      return (
        <ProjectView
          project={project}
          model={singleModel}
          userId={user.id}
          dispatch={singleDispatch}
          filterTab={filterTab}
          onFilterChange={setFilterTab}
          onRenameList={handleRenameList}
          onDeleteList={handleDeleteList}
          onMoveList={handleMoveList}
          otherProjects={projects.filter(p => p.id !== selectedProjectId)}
          onMoveListToProject={handleMoveListToProject}
        />
      )
    }

    // No selection
    return <EmptyState message="Select a project or smart list to get started" />
  }

  return (
    <div className="app-layout">
      <TopBar
        user={user}
        onSignOut={onSignOut}
        onSync={sync}
        onToggleOffline={toggleOffline}
        isOffline={isOffline}
        isFlushing={isFlushing}
        status={status}
        pendingCount={pendingCount}
      />

      <div className="content-wrapper">
        <Sidebar
          selectedView={selectedView}
          onSelectView={handleSelectView}
          projects={projects}
          selectedProjectId={selectedProjectId}
          selectedListId={selectedListId}
          onSelectProject={handleSelectProject}
          onSelectList={handleSelectList}
          onCreateProject={handleCreateProject}
          onAddList={handleAddList}
          projectsLoading={projectsLoading}
          getProjectLists={getProjectLists}
          getListTaskCount={getListTaskCount}
          priorityCount={priorityCount}
          logbookCount={logbookCount}
          allTasksCount={allTasksCount}
          onManageMembers={handleManageMembers}
          getProjectMode={getProjectMode}
        />

        <MainContent>
          {renderContent()}
        </MainContent>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

// ============================================================================
// App Container (Auth wrapper)
// ============================================================================

function AppContainer() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return (
      <div className="auth-container">
        <h1 className="auth-container__title">Todo</h1>
        <p className="auth-container__subtitle">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-container">
        <h1 className="auth-container__title">Todo</h1>
        <p className="auth-container__subtitle">Collaborative task management</p>
        <AuthForm />
      </div>
    )
  }

  return <TodoApp user={user} onSignOut={handleSignOut} />
}

export default AppContainer
