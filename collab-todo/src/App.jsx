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

function PriorityView({ tasks, onCompleteTask, onStarTask, onEditTask, onDeleteTask, onMoveTask, getAvailableLists, getProjectTags, onAddTag, onRemoveTag, onCreateTag, onSetDueDate, onAssignTask, onUnassignTask, getProjectMembers }) {
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
            onSetDueDate={(id, date) => onSetDueDate(task.projectId, id, date)}
            allMembers={getProjectMembers ? getProjectMembers(task.projectId) : []}
            onAssign={onAssignTask ? (id, userId) => onAssignTask(task.projectId, id, userId) : undefined}
            onUnassign={onUnassignTask ? (id, userId) => onUnassignTask(task.projectId, id, userId) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

function LogbookView({ tasks, onCompleteTask, onStarTask, getProjectTags, getProjectMembers }) {
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
            allMembers={getProjectMembers ? getProjectMembers(task.projectId) : []}
          />
        ))}
      </div>
    </div>
  )
}

function AllTasksView({ tasks, onCompleteTask, onStarTask, onEditTask, onDeleteTask, onMoveTask, getAvailableLists, getProjectTags, onAddTag, onRemoveTag, onCreateTag, onSetDueDate, onAssignTask, onUnassignTask, getProjectMembers }) {
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
            onSetDueDate={(id, date) => onSetDueDate(task.projectId, id, date)}
            allMembers={getProjectMembers ? getProjectMembers(task.projectId) : []}
            onAssign={onAssignTask ? (id, userId) => onAssignTask(task.projectId, id, userId) : undefined}
            onUnassign={onUnassignTask ? (id, userId) => onUnassignTask(task.projectId, id, userId) : undefined}
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
  onMoveListToProject,
  members,
  selectedListId,
  onRenameProject,
  onAddList
}) {
  const [collapsedLists, setCollapsedLists] = useState(new Set())
  const [showAddListForm, setShowAddListForm] = useState(false)
  const [newListName, setNewListName] = useState('')

  const handleAddListSubmit = (e) => {
    e.preventDefault()
    if (newListName.trim() && onAddList) {
      onAddList(newListName.trim())
      setNewListName('')
      setShowAddListForm(false)
    }
  }

  const allLists = useMemo(() => {
    if (!model) return []
    return App.GetLists(model).map(id => ({
      id,
      name: App.GetListName(model, id)
    }))
  }, [model])

  // Filter to selected list if one is chosen
  const lists = useMemo(() => {
    if (selectedListId !== null) {
      return allLists.filter(l => l.id === selectedListId)
    }
    return allLists
  }, [allLists, selectedListId])

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
        canRename={project.isOwner}
        onRename={onRenameProject}
      />

      <FilterTabs
        tabs={[
          { id: 'all', label: 'All' },
          { id: 'important', label: `Priority${App.CountPriorityTasks(model) > 0 ? ` (${App.CountPriorityTasks(model)})` : ''}` },
          { id: 'logbook', label: 'Logbook' }
        ]}
        activeTab={filterTab}
        onTabChange={onFilterChange}
        onAddList={onAddList ? () => setShowAddListForm(true) : undefined}
      />

      {showAddListForm && (
        <form className="project-view__add-list-form" onSubmit={handleAddListSubmit}>
          <input
            type="text"
            placeholder="List name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setNewListName('')
                setShowAddListForm(false)
              }
            }}
          />
          <button type="submit" disabled={!newListName.trim()}>Add</button>
          <button type="button" onClick={() => { setNewListName(''); setShowAddListForm(false) }}>Cancel</button>
        </form>
      )}

      {lists.length === 0 ? (
        <EmptyState message={selectedListId !== null ? "List not found" : "No lists yet. Click '+ Add List' above."} />
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
            allLists={allLists}
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
            availableLists={allLists}
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
            onSetDueDate={(taskId, date) => {
              if (date) {
                dispatch(App.SetDueDateValue(taskId, date.year, date.month, date.day))
              } else {
                dispatch(App.ClearDueDate(taskId))
              }
            }}
            allMembers={members}
            onAssign={(taskId, userId) =>
              dispatch(App.AssignTask(taskId, userId))
            }
            onUnassign={(taskId, userId) =>
              dispatch(App.UnassignTask(taskId, userId))
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
  const { projects, loading: projectsLoading, createProject, renameProject, refresh: refreshProjects } = useProjects()

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
    getProjectMembers,
    moveListToProject,
    refresh: sync,
    error,
    status,
    isOffline,
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

  const handleRenameProject = async (newName) => {
    if (selectedProjectId) {
      try {
        await renameProject(selectedProjectId, newName)
      } catch (err) {
        console.error('Failed to rename project:', err)
      }
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
    const userId = await inviteMember(email)
    // Then update domain model (so user can be assigned to tasks)
    if (userId) {
      singleDispatch(App.AddMember(userId))
    }
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

  const handleSetDueDateAll = (projectId, taskId, date) => {
    const dispatch = createDispatch(projectId)
    if (date) {
      dispatch(App.SetDueDateValue(taskId, date.year, date.month, date.day))
    } else {
      dispatch(App.ClearDueDate(taskId))
    }
  }

  const handleAssignTaskAll = (projectId, taskId, userId) => {
    const dispatch = createDispatch(projectId)
    dispatch(App.AssignTask(taskId, userId))
  }

  const handleUnassignTaskAll = (projectId, taskId, userId) => {
    const dispatch = createDispatch(projectId)
    dispatch(App.UnassignTask(taskId, userId))
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
          onSetDueDate={handleSetDueDateAll}
          onAssignTask={handleAssignTaskAll}
          onUnassignTask={handleUnassignTaskAll}
          getProjectMembers={getProjectMembers}
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
          onSetDueDate={handleSetDueDateAll}
          onAssignTask={handleAssignTaskAll}
          onUnassignTask={handleUnassignTaskAll}
          getProjectMembers={getProjectMembers}
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
          getProjectMembers={getProjectMembers}
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
          onMoveListToProject={project.isOwner ? handleMoveListToProject : undefined}
          members={members}
          selectedListId={selectedListId}
          onRenameProject={project.isOwner ? handleRenameProject : undefined}
          onAddList={handleAddList}
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
        isOffline={isOffline}
        isFlushing={isFlushing}
        status={status}
      />

      <div className="content-wrapper" style={isOffline ? { pointerEvents: 'none', opacity: 0.5 } : undefined}>
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

      {isOffline && (
        <div className="offline-overlay">
          <div className="offline-overlay__content">
            <h2>You are offline</h2>
            <p>Please reconnect to the internet to continue using the app.</p>
          </div>
        </div>
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
