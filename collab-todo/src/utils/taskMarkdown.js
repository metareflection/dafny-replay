/**
 * Export a single list's tasks as markdown.
 *   tasks: [{ title, completed, starred }]
 */
export function exportListToMarkdown(listName, tasks) {
  const lines = [`# ${listName}`, '']
  for (const t of tasks) {
    const check = t.completed ? 'x' : ' '
    const star = t.starred ? ' ★' : ''
    lines.push(`- [${check}] ${t.title}${star}`)
  }
  return lines.join('\n') + '\n'
}

/**
 * Export an entire project (multiple lists) as markdown.
 *   lists: [{ name, tasks: [{ title, completed, starred }] }]
 */
export function exportProjectToMarkdown(projectName, lists) {
  const lines = [`# ${projectName}`, '']
  for (const list of lists) {
    lines.push(`## ${list.name}`, '')
    if (list.tasks.length === 0) {
      lines.push('*(no tasks)*', '')
    } else {
      for (const t of list.tasks) {
        const check = t.completed ? 'x' : ' '
        const star = t.starred ? ' ★' : ''
        lines.push(`- [${check}] ${t.title}${star}`)
      }
      lines.push('')
    }
  }
  return lines.join('\n')
}

/**
 * Parse markdown into tasks for a single list.
 * Returns [{ title, completed, starred }]
 * Accepts:
 *   - [x] title    → completed
 *   - [ ] title    → incomplete
 *   - title        → incomplete (plain list item)
 *   title ★        → starred
 */
export function parseTasksFromMarkdown(text) {
  const tasks = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    // Checkbox item
    const checkMatch = line.match(/^-\s*\[([ xX])\]\s+(.+)$/)
    if (checkMatch) {
      const completed = checkMatch[1].toLowerCase() === 'x'
      let title = checkMatch[2].trim()
      const starred = title.endsWith('★')
      if (starred) title = title.replace(/\s*★\s*$/, '').trim()
      if (title) tasks.push({ title, completed, starred })
      continue
    }
    // Plain list item
    const plainMatch = line.match(/^-\s+(.+)$/)
    if (plainMatch) {
      let title = plainMatch[1].trim()
      const starred = title.endsWith('★')
      if (starred) title = title.replace(/\s*★\s*$/, '').trim()
      if (title) tasks.push({ title, completed: false, starred })
    }
  }
  return tasks
}

/**
 * Parse markdown with headings into multiple lists.
 * Returns [{ name, tasks: [{ title, completed, starred }] }]
 *
 * ## Heading  → new list
 * # Heading   → project title (ignored for tasks, but starts first list context)
 */
export function parseProjectFromMarkdown(text) {
  const lists = []
  let currentList = null

  for (const raw of text.split('\n')) {
    const line = raw.trim()

    // ## heading → new list
    const h2 = line.match(/^##\s+(.+)$/)
    if (h2) {
      currentList = { name: h2[1].trim(), tasks: [] }
      lists.push(currentList)
      continue
    }

    // # heading → skip (project title)
    if (/^#\s+/.test(line)) continue

    // Task lines go into current list
    if (!currentList) continue

    const checkMatch = line.match(/^-\s*\[([ xX])\]\s+(.+)$/)
    if (checkMatch) {
      const completed = checkMatch[1].toLowerCase() === 'x'
      let title = checkMatch[2].trim()
      const starred = title.endsWith('★')
      if (starred) title = title.replace(/\s*★\s*$/, '').trim()
      if (title) currentList.tasks.push({ title, completed, starred })
      continue
    }

    const plainMatch = line.match(/^-\s+(.+)$/)
    if (plainMatch) {
      let title = plainMatch[1].trim()
      const starred = title.endsWith('★')
      if (starred) title = title.replace(/\s*★\s*$/, '').trim()
      if (title) currentList.tasks.push({ title, completed: false, starred })
    }
  }

  return lists
}

/** Trigger a file download in the browser */
export function downloadMarkdown(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Open a file picker and read the selected .md file */
export function pickAndReadMarkdownFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.txt'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    }
    input.click()
  })
}
