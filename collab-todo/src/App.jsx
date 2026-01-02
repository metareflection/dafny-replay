import { useState, useEffect, useMemo, useCallback } from 'react'
import { Star, CheckSquare, Circle } from 'lucide-react'
import { supabase, isSupabaseConfigured, signOut } from './supabase.js'
import { useProjects } from './hooks/useCollaborativeProject.js'
import { useCollaborativeProjectOffline } from './hooks/useCollaborativeProjectOffline.js'
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

  // Single project mode
  const {
    model: singleModel,
    version,
    dispatch: singleDispatch,
    sync,
    pendingCount,
    error: singleError,
    status,
    isOffline,
    toggleOffline,
    isFlushing
  } = useCollaborativeProjectOffline(selectedProjectId)

  // All projects mode
  const projectIds = useMemo(() => projects.map(p => p.id), [projects])
  const {
    projectData,
    loading: allLoading,
    createDispatch,
    priorityTasks,
    logbookTasks,
    getProjectModel,
    getProjectLists,
    getListTaskCount
  } = useAllProjects(viewMode === 'all' ? projectIds : [])

  // Show errors as toast
  useEffect(() => {
    if (singleError) {
      setToast({ message: singleError, type: 'error' })
    }
  }, [singleError])

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
    setSelectedProjectId(null)
    setSelectedListId(null)
  }

  const handleAddList = (name) => {
    if (viewMode === 'single' && singleModel) {
      singleDispatch(App.AddList(name))
    }
  }

  const handleRenameList = (listId, newName) => {
    if (viewMode === 'single') {
      singleDispatch(App.RenameList(listId, newName))
    }
  }

  const handleDeleteList = (listId) => {
    if (confirm('Delete this list? All tasks in it will be permanently deleted.')) {
      if (viewMode === 'single') {
        singleDispatch(App.DeleteList(listId))
      }
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

  const getAvailableListsForProject = (projectId) => {
    return getProjectLists(projectId)
  }

  // Count calculations for sidebar
  const priorityCount = useMemo(() => {
    if (viewMode === 'all') {
      return priorityTasks.length
    }
    if (!singleModel) return 0
    const lists = App.GetLists(singleModel)
    let count = 0
    for (const listId of lists) {
      const taskIds = App.GetTasksInList(singleModel, listId)
      for (const taskId of taskIds) {
        const task = App.GetTask(singleModel, taskId)
        if (task.starred && !task.completed && !task.deleted) count++
      }
    }
    return count
  }, [viewMode, singleModel, priorityTasks])

  const logbookCount = useMemo(() => {
    if (viewMode === 'all') {
      return logbookTasks.length
    }
    if (!singleModel) return 0
    const lists = App.GetLists(singleModel)
    let count = 0
    for (const listId of lists) {
      const taskIds = App.GetTasksInList(singleModel, listId)
      for (const taskId of taskIds) {
        const task = App.GetTask(singleModel, taskId)
        if (task.completed && !task.deleted) count++
      }
    }
    return count
  }, [viewMode, singleModel, logbookTasks])

  // Get single-mode priority/logbook tasks
  const singlePriorityTasks = useMemo(() => {
    if (!singleModel) return []
    const tasks = []
    const lists = App.GetLists(singleModel)
    for (const listId of lists) {
      const taskIds = App.GetTasksInList(singleModel, listId)
      for (const taskId of taskIds) {
        const task = App.GetTask(singleModel, taskId)
        if (task.starred && !task.completed && !task.deleted) {
          tasks.push({
            id: taskId,
            projectId: selectedProjectId,
            listId,
            listName: App.GetListName(singleModel, listId),
            ...task
          })
        }
      }
    }
    return tasks
  }, [singleModel, selectedProjectId])

  const singleLogbookTasks = useMemo(() => {
    if (!singleModel) return []
    const tasks = []
    const lists = App.GetLists(singleModel)
    for (const listId of lists) {
      const taskIds = App.GetTasksInList(singleModel, listId)
      for (const taskId of taskIds) {
        const task = App.GetTask(singleModel, taskId)
        if (task.completed && !task.deleted) {
          tasks.push({
            id: taskId,
            projectId: selectedProjectId,
            listId,
            listName: App.GetListName(singleModel, listId),
            ...task
          })
        }
      }
    }
    return tasks
  }, [singleModel, selectedProjectId])

  // Get lists for single project mode
  const singleProjectLists = useMemo(() => {
    if (!singleModel) return []
    return App.GetLists(singleModel).map(id => ({
      id,
      name: App.GetListName(singleModel, id)
    }))
  }, [singleModel])

  // Render main content
  const renderContent = () => {
    // Smart list views
    if (selectedView === 'priority') {
      const tasks = viewMode === 'all' ? priorityTasks : singlePriorityTasks
      return (
        <PriorityView
          tasks={tasks}
          onCompleteTask={viewMode === 'all' ? handleCompleteTaskAll : (_, taskId, completed) =>
            singleDispatch(completed ? App.CompleteTask(taskId) : App.UncompleteTask(taskId))
          }
          onStarTask={viewMode === 'all' ? handleStarTaskAll : (_, taskId, starred) =>
            singleDispatch(starred ? App.StarTask(taskId) : App.UnstarTask(taskId))
          }
          onEditTask={viewMode === 'all' ? handleEditTaskAll : (_, taskId, title, notes) =>
            singleDispatch(App.EditTask(taskId, title, notes))
          }
          onDeleteTask={viewMode === 'all' ? handleDeleteTaskAll : (_, taskId) =>
            singleDispatch(App.DeleteTask(taskId, user.id))
          }
          onMoveTask={viewMode === 'all' ? handleMoveTaskAll : (_, taskId, listId) =>
            singleDispatch(App.MoveTask(taskId, listId, App.AtEnd()))
          }
          getAvailableLists={viewMode === 'all' ? getAvailableListsForProject : () => singleProjectLists}
        />
      )
    }

    if (selectedView === 'logbook') {
      const tasks = viewMode === 'all' ? logbookTasks : singleLogbookTasks
      return (
        <LogbookView
          tasks={tasks}
          onCompleteTask={viewMode === 'all' ? handleCompleteTaskAll : (_, taskId, completed) =>
            singleDispatch(completed ? App.CompleteTask(taskId) : App.UncompleteTask(taskId))
          }
          onStarTask={viewMode === 'all' ? handleStarTaskAll : (_, taskId, starred) =>
            singleDispatch(starred ? App.StarTask(taskId) : App.UnstarTask(taskId))
          }
        />
      )
    }

    // Project view
    if (selectedProjectId && viewMode === 'single') {
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
          getProjectLists={viewMode === 'all' ? getProjectLists : (projectId) => {
            if (projectId === selectedProjectId && singleModel) {
              return App.GetLists(singleModel).map(id => ({
                id,
                name: App.GetListName(singleModel, id)
              }))
            }
            return []
          }}
          getListTaskCount={viewMode === 'all' ? getListTaskCount : (projectId, listId) => {
            if (projectId === selectedProjectId && singleModel) {
              const taskIds = App.GetTasksInList(singleModel, listId)
              return taskIds.filter(id => {
                const task = App.GetTask(singleModel, id)
                return !task.deleted && !task.completed
              }).length
            }
            return 0
          }}
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
