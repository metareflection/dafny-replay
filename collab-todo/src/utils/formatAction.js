/**
 * Format actions for human-readable display in the Operation Log
 */

/**
 * Format a single-project action for display
 * @param {object} action - The action object with type and parameters
 * @param {object} context - Optional context (listNames, taskTitles, tagNames, etc.)
 * @returns {{ type: string, description: string }}
 */
export function formatAction(action, context = {}) {
  const { listNames = {}, taskTitles = {}, tagNames = {}, memberEmails = {} } = context

  switch (action.type) {
    // List actions
    case 'AddList':
      return {
        type: 'AddList',
        description: `Create list "${action.name}"`,
      }
    case 'RenameList':
      return {
        type: 'RenameList',
        description: `Rename list to "${action.newName}"`,
      }
    case 'DeleteList': {
      const listName = listNames[action.listId] || `list #${action.listId}`
      return {
        type: 'DeleteList',
        description: `Delete "${listName}"`,
      }
    }
    case 'MoveList':
      return {
        type: 'MoveList',
        description: `Reorder list`,
      }

    // Task actions
    case 'AddTask': {
      const listName = listNames[action.listId] || `list #${action.listId}`
      return {
        type: 'AddTask',
        description: `Add "${truncate(action.title, 30)}" to ${listName}`,
      }
    }
    case 'EditTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      return {
        type: 'EditTask',
        description: `Edit "${truncate(taskTitle, 30)}"`,
      }
    }
    case 'DeleteTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      return {
        type: 'DeleteTask',
        description: `Delete "${truncate(taskTitle, 30)}"`,
      }
    }
    case 'RestoreTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      return {
        type: 'RestoreTask',
        description: `Restore "${truncate(taskTitle, 30)}"`,
      }
    }
    case 'MoveTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      const toListName = listNames[action.toList] || `list #${action.toList}`
      return {
        type: 'MoveTask',
        description: `Move "${truncate(taskTitle, 25)}" to ${toListName}`,
      }
    }
    case 'CompleteTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      return {
        type: 'CompleteTask',
        description: `Complete "${truncate(taskTitle, 30)}"`,
      }
    }
    case 'UncompleteTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      return {
        type: 'UncompleteTask',
        description: `Uncomplete "${truncate(taskTitle, 30)}"`,
      }
    }
    case 'StarTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      return {
        type: 'StarTask',
        description: `Star "${truncate(taskTitle, 30)}"`,
      }
    }
    case 'UnstarTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      return {
        type: 'UnstarTask',
        description: `Unstar "${truncate(taskTitle, 30)}"`,
      }
    }

    // Due date
    case 'SetDueDate': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      if (action.dueDate && action.dueDate.type === 'Some') {
        const d = action.dueDate.value
        const dateStr = formatDate(d)
        return {
          type: 'SetDueDate',
          description: `Set due date on "${truncate(taskTitle, 25)}" to ${dateStr}`,
        }
      }
      return {
        type: 'SetDueDate',
        description: `Clear due date on "${truncate(taskTitle, 30)}"`,
      }
    }

    // Assignment
    case 'AssignTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      const memberName = memberEmails[action.userId] || truncateId(action.userId)
      return {
        type: 'AssignTask',
        description: `Assign "${truncate(taskTitle, 20)}" to ${memberName}`,
      }
    }
    case 'UnassignTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      const memberName = memberEmails[action.userId] || truncateId(action.userId)
      return {
        type: 'UnassignTask',
        description: `Unassign ${memberName} from "${truncate(taskTitle, 20)}"`,
      }
    }

    // Tags
    case 'AddTagToTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      const tagName = tagNames[action.tagId] || `tag #${action.tagId}`
      return {
        type: 'AddTagToTask',
        description: `Add #${tagName} to "${truncate(taskTitle, 25)}"`,
      }
    }
    case 'RemoveTagFromTask': {
      const taskTitle = taskTitles[action.taskId] || `task #${action.taskId}`
      const tagName = tagNames[action.tagId] || `tag #${action.tagId}`
      return {
        type: 'RemoveTagFromTask',
        description: `Remove #${tagName} from "${truncate(taskTitle, 25)}"`,
      }
    }
    case 'CreateTag':
      return {
        type: 'CreateTag',
        description: `Create tag #${action.name}`,
      }
    case 'RenameTag': {
      const tagName = tagNames[action.tagId] || `tag #${action.tagId}`
      return {
        type: 'RenameTag',
        description: `Rename ${tagName} to #${action.newName}`,
      }
    }
    case 'DeleteTag': {
      const tagName = tagNames[action.tagId] || `tag #${action.tagId}`
      return {
        type: 'DeleteTag',
        description: `Delete tag #${tagName}`,
      }
    }

    // Collaboration
    case 'MakeCollaborative':
      return {
        type: 'MakeCollaborative',
        description: 'Make project collaborative',
      }
    case 'AddMember': {
      const memberName = memberEmails[action.userId] || truncateId(action.userId)
      return {
        type: 'AddMember',
        description: `Add member ${memberName}`,
      }
    }
    case 'RemoveMember': {
      const memberName = memberEmails[action.userId] || truncateId(action.userId)
      return {
        type: 'RemoveMember',
        description: `Remove member ${memberName}`,
      }
    }

    case 'NoOp':
      return {
        type: 'NoOp',
        description: 'No operation',
      }

    default:
      return {
        type: action.type || 'Unknown',
        description: `${action.type || 'Unknown action'}`,
      }
  }
}

/**
 * Format a multi-project action for display
 * @param {object} multiAction - The multi-action object
 * @param {object} context - Optional context (projectNames, listNames, taskTitles, etc.)
 * @returns {{ type: string, description: string }}
 */
export function formatMultiAction(multiAction, context = {}) {
  const { projectNames = {} } = context

  switch (multiAction.type) {
    case 'Single': {
      const projectName = projectNames[multiAction.project] || 'project'
      const inner = formatAction(multiAction.action, context)
      return {
        type: inner.type,
        description: `${inner.description} (${projectName})`,
      }
    }
    case 'MoveTaskTo': {
      const srcName = projectNames[multiAction.srcProject] || 'source'
      const dstName = projectNames[multiAction.dstProject] || 'destination'
      return {
        type: 'MoveTaskTo',
        description: `Move task from ${srcName} to ${dstName}`,
      }
    }
    case 'CopyTaskTo': {
      const srcName = projectNames[multiAction.srcProject] || 'source'
      const dstName = projectNames[multiAction.dstProject] || 'destination'
      return {
        type: 'CopyTaskTo',
        description: `Copy task from ${srcName} to ${dstName}`,
      }
    }
    case 'MoveListTo': {
      const srcName = projectNames[multiAction.srcProject] || 'source'
      const dstName = projectNames[multiAction.dstProject] || 'destination'
      return {
        type: 'MoveListTo',
        description: `Move list from ${srcName} to ${dstName}`,
      }
    }
    default:
      return {
        type: multiAction.type || 'Unknown',
        description: `${multiAction.type || 'Unknown multi-action'}`,
      }
  }
}

// Helpers

function truncate(str, maxLen) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

function truncateId(id) {
  if (!id) return 'unknown'
  if (id.length <= 8) return id
  return id.slice(0, 8) + '…'
}

function formatDate(d) {
  if (!d) return ''
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.month - 1]} ${d.day}`
}
