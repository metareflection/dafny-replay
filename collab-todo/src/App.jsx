import { useState, useEffect, useMemo, useCallback } from 'react'
import { Star, CheckSquare, Circle } from 'lucide-react'
import { supabase, isSupabaseConfigured, signOut } from './supabase.js'
import { useProjects } from './hooks/useCollaborativeProject.js'
import { useAllProjects } from './hooks/useAllProjects.js'
import App from './dafny/app-extras.js'

// Components
import { AuthForm } from './components/auth'
import { Toast } from './components/common'
import { TopBar, Sidebar, MainContent, EmptyState, LoadingState } from './components/layout'
import { TaskList, TaskItem } from './components/tasks'
import { ProjectHeader, FilterTabs } from './components/project'

// Styles
import './styles/global.css'
import './components/layout/layout.css'

// ============================================================================
// Smart List Views
// ============================================================================

function PriorityView({ tasks, onCompleteTask, onStarTask, onEditTask, onDeleteTask, onMoveTask, getAvailableLists }) {
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
          />
        ))}
      </div>
    </div>
  )
}

function LogbookView({ tasks, onCompleteTask, onStarTask }) {
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
  onDeleteList
}) {
  const [collapsedLists, setCollapsedLists] = useState(new Set())

  const lists = useMemo(() => {
    if (!model) return []
    return App.GetLists(model).map(id => ({
      id,
      name: App.GetListName(model, id)
    }))
  }, [model])

  const getTasksForList = useCallback((listId) => {
    if (!model) return []
    const taskIds = App.GetTasksInList(model, listId)
    return taskIds
      .map(id => ({ id, ...App.GetTask(model, id) }))
      .filter(t => !t.deleted)
      .filter(t => filterTab === 'all' || (filterTab === 'important' && t.starred))
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
          { id: 'important', label: 'Important' }
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
  const [viewMode, setViewMode] = useState('single') // 'single' | 'all'
  const [selectedView, setSelectedView] = useState(null) // 'priority' | 'logbook' | null
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [selectedListId, setSelectedListId] = useState(null)
  const [filterTab, setFilterTab] = useState('all')
  const [toast, setToast] = useState(null)

  // Projects list
  const { projects, loading: projectsLoading, createProject, refresh: refreshProjects } = useProjects()

  // Unified multi-project state (single source of truth)
  const projectIds = useMemo(() => projects.map(p => p.id), [projects])
  const {
    createDispatch,
    priorityTasks,
    logbookTasks,
    getProjectModel,
    getProjectLists,
    getListTaskCount,
    refresh: sync,
    error,
    status,
    isOffline,
    toggleOffline,
    pendingCount,
    hasPending: isFlushing
  } = useAllProjects(projectIds)

  // Derive single-project model from unified state
  const singleModel = selectedProjectId ? getProjectModel(selectedProjectId) : null
  const singleDispatch = useMemo(
    () => selectedProjectId ? createDispatch(selectedProjectId) : () => {},
    [selectedProjectId, createDispatch]
  )

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
  }

  const handleSelectList = (projectId, listId) => {
    setSelectedProjectId(projectId)
    setSelectedListId(listId)
    setSelectedView(null)
  }

  const handleSelectView = (view) => {
    setSelectedView(view)
    // Keep selectedProjectId for filtering in single mode
    setSelectedListId(null)
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

  // Get priority/logbook tasks - respects viewMode
  // In single mode, filter to selected project (still uses verified Dafny data)
  const filteredPriorityTasks = useMemo(() => {
    if (viewMode === 'single' && selectedProjectId) {
      return priorityTasks.filter(t => t.projectId === selectedProjectId)
    }
    return priorityTasks
  }, [viewMode, selectedProjectId, priorityTasks])

  const filteredLogbookTasks = useMemo(() => {
    if (viewMode === 'single' && selectedProjectId) {
      return logbookTasks.filter(t => t.projectId === selectedProjectId)
    }
    return logbookTasks
  }, [viewMode, selectedProjectId, logbookTasks])

  // Count calculations for sidebar
  const priorityCount = filteredPriorityTasks.length
  const logbookCount = filteredLogbookTasks.length

  // Render main content
  const renderContent = () => {
    // Smart list views
    if (selectedView === 'priority') {
      // Respects viewMode: single mode shows only selected project
      return (
        <PriorityView
          tasks={filteredPriorityTasks}
          onCompleteTask={handleCompleteTaskAll}
          onStarTask={handleStarTaskAll}
          onEditTask={handleEditTaskAll}
          onDeleteTask={handleDeleteTaskAll}
          onMoveTask={handleMoveTaskAll}
          getAvailableLists={getProjectLists}
        />
      )
    }

    if (selectedView === 'logbook') {
      // Respects viewMode: single mode shows only selected project
      return (
        <LogbookView
          tasks={filteredLogbookTasks}
          onCompleteTask={handleCompleteTaskAll}
          onStarTask={handleStarTaskAll}
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
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
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
