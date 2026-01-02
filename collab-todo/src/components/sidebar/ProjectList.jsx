import { useState } from 'react'
import { ChevronRight, ChevronDown, Circle, Plus } from 'lucide-react'
import { SidebarItem } from './SidebarItem.jsx'
import './sidebar.css'

export function ProjectList({
  projects,
  selectedProjectId,
  selectedListId,
  onSelectProject,
  onSelectList,
  onCreateProject,
  getProjectLists,
  getListTaskCount,
  loading
}) {
  const [expandedProjects, setExpandedProjects] = useState(new Set())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creating, setCreating] = useState(false)

  const toggleExpand = (projectId) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newProjectName.trim() || creating) return

    setCreating(true)
    try {
      await onCreateProject(newProjectName.trim())
      setNewProjectName('')
      setShowCreateForm(false)
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="project-list">
      <div className="project-list__header">
        <span className="project-list__title">Projects</span>
        <button
          className="project-list__add-btn"
          onClick={() => setShowCreateForm(true)}
          title="New Project"
        >
          <Plus size={14} />
        </button>
      </div>

      {showCreateForm && (
        <form className="project-list__form" onSubmit={handleCreateProject}>
          <input
            type="text"
            placeholder="Project name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            autoFocus
            disabled={creating}
          />
          <div className="project-list__form-actions">
            <button type="submit" disabled={!newProjectName.trim() || creating}>
              {creating ? '...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && projects.length === 0 && (
        <div className="project-list__loading">Loading...</div>
      )}

      {!loading && projects.length === 0 && (
        <div className="project-list__empty">No projects yet</div>
      )}

      <ul className="project-list__items">
        {projects.map(project => {
          const isExpanded = expandedProjects.has(project.id)
          const isSelected = selectedProjectId === project.id && !selectedListId
          const lists = getProjectLists ? getProjectLists(project.id) : []

          return (
            <li key={project.id} className="project-list__project">
              <div className="project-list__project-row">
                <button
                  className="project-list__expand-btn"
                  onClick={() => toggleExpand(project.id)}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <button
                  className={`project-list__project-btn ${isSelected ? 'project-list__project-btn--selected' : ''}`}
                  onClick={() => onSelectProject(project.id)}
                >
                  <Circle size={14} className="project-list__project-icon" />
                  <span className="project-list__project-name">{project.name}</span>
                </button>
              </div>

              {isExpanded && lists.length > 0 && (
                <ul className="project-list__lists">
                  {lists.map(list => (
                    <li key={list.id}>
                      <SidebarItem
                        label={list.name}
                        count={getListTaskCount ? getListTaskCount(project.id, list.id) : 0}
                        selected={selectedProjectId === project.id && selectedListId === list.id}
                        onClick={() => onSelectList(project.id, list.id)}
                        indent
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
