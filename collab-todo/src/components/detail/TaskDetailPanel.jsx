import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X, Paperclip, Link2, Upload, Trash2,
  ExternalLink, Eye, Edit3
} from 'lucide-react'
import { useTaskAttachments } from '../../hooks/useTaskAttachments.js'
import './detail.css'

const NOTES_KEY = '_task_notes'

export function TaskDetailPanel({
  task,
  taskId,
  projectId,
  projectName,
  onClose,
  allTags = {},
  allMembers = [],
  userId
}) {
  const {
    attachments,
    loading,
    addFile,
    addLink,
    addMarkdown,
    updateMarkdown,
    remove
  } = useTaskAttachments(projectId, taskId)

  const [mode, setMode] = useState('write') // 'write' | 'preview'
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [addMode, setAddMode] = useState(null) // 'file' | 'link' | null
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [showFiles, setShowFiles] = useState(false)
  const fileInputRef = useRef(null)
  const saveTimerRef = useRef(null)
  const notesIdRef = useRef(null)

  // Separate the main markdown doc from file/link attachments
  const notesAttachment = attachments.find(a => a.type === 'markdown' && a.name === NOTES_KEY)
  const fileAttachments = attachments.filter(a => a.type !== 'markdown' || a.name !== NOTES_KEY)

  // Sync draft from loaded notes attachment
  useEffect(() => {
    if (loading) return
    if (notesAttachment) {
      notesIdRef.current = notesAttachment.id
      setDraft(notesAttachment.content || '')
    } else {
      notesIdRef.current = null
      setDraft('')
    }
  }, [loading, notesAttachment?.id])

  // Reset state when task changes
  useEffect(() => {
    setMode('write')
    setAddMode(null)
    setShowFiles(false)
    notesIdRef.current = null
    // Cancel pending saves
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [taskId, projectId])

  // Auto-save with debounce
  const scheduleSave = useCallback((content) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        if (notesIdRef.current) {
          await updateMarkdown(notesIdRef.current, NOTES_KEY, content)
        } else if (content.trim()) {
          const att = await addMarkdown(NOTES_KEY, content)
          if (att) notesIdRef.current = att.id
        }
      } catch {
        // error handled in hook
      } finally {
        setSaving(false)
      }
    }, 800)
  }, [updateMarkdown, addMarkdown])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleDraftChange = (e) => {
    const val = e.target.value
    setDraft(val)
    scheduleSave(val)
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await addFile(file)
    } catch {
      // error handled in hook
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    setAddMode(null)
  }

  const handleAddLink = async (e) => {
    e.preventDefault()
    if (!linkName.trim() || !linkUrl.trim()) return
    try {
      await addLink(linkName.trim(), linkUrl.trim())
      setLinkName('')
      setLinkUrl('')
      setAddMode(null)
    } catch {
      // error handled in hook
    }
  }

  const isOwner = (att) => att.created_by === userId

  const getFileIcon = (name) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image'
    return 'file'
  }

  // Simple markdown-to-html: headings, bold, italic, code blocks, inline code, links, lists
  const renderMarkdown = (text) => {
    if (!text) return '<p class="detail-panel__preview-empty">Nothing here yet. Switch to Write to start adding notes.</p>'

    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const html = escaped
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="detail-panel__code-block"><code>$2</code></pre>')
      // Headings
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      // Bold + italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="detail-panel__inline-code">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Unordered lists
      .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
      // Paragraphs (double newline)
      .replace(/\n\n/g, '</p><p>')
      // Single newlines
      .replace(/\n/g, '<br/>')

    return `<p>${html}</p>`
  }

  return (
    <div className="detail-panel">
      {/* Header: project badge, write/preview toggle, close */}
      <div className="detail-panel__header">
        {projectName && (
          <span className="detail-panel__project-badge">{projectName}</span>
        )}
        <div className="detail-panel__header-spacer" />
        <div className="detail-panel__mode-toggle">
          <button
            className={`detail-panel__mode-btn ${mode === 'write' ? 'detail-panel__mode-btn--active' : ''}`}
            onClick={() => setMode('write')}
          >
            <Edit3 size={13} />
            Write
          </button>
          <button
            className={`detail-panel__mode-btn ${mode === 'preview' ? 'detail-panel__mode-btn--active' : ''}`}
            onClick={() => setMode('preview')}
          >
            <Eye size={13} />
            Preview
          </button>
        </div>
        {saving && <span className="detail-panel__saving">Saving...</span>}
        <button className="detail-panel__close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Main body: editor or preview */}
      <div className="detail-panel__editor-area">
        {loading ? (
          <div className="detail-panel__loading">Loading...</div>
        ) : mode === 'write' ? (
          <textarea
            className="detail-panel__textarea"
            value={draft}
            onChange={handleDraftChange}
            placeholder="Write notes, paste content, use markdown..."
            spellCheck={false}
          />
        ) : (
          <div
            className="detail-panel__preview"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(draft) }}
          />
        )}
      </div>

      {/* File/link attachments footer */}
      <div className="detail-panel__footer">
        <div className="detail-panel__footer-bar">
          <button
            className="detail-panel__footer-toggle"
            onClick={() => setShowFiles(!showFiles)}
          >
            <Paperclip size={13} />
            Files
            {fileAttachments.length > 0 && (
              <span className="detail-panel__count">{fileAttachments.length}</span>
            )}
          </button>
          <div className="detail-panel__footer-spacer" />
          <button
            className={`detail-panel__footer-btn ${addMode === 'file' ? 'detail-panel__footer-btn--active' : ''}`}
            onClick={() => {
              setAddMode(addMode === 'file' ? null : 'file')
              setShowFiles(true)
              if (addMode !== 'file') {
                setTimeout(() => fileInputRef.current?.click(), 0)
              }
            }}
            title="Upload file"
          >
            <Upload size={12} />
          </button>
          <button
            className={`detail-panel__footer-btn ${addMode === 'link' ? 'detail-panel__footer-btn--active' : ''}`}
            onClick={() => { setAddMode(addMode === 'link' ? null : 'link'); setShowFiles(true) }}
            title="Add link"
          >
            <Link2 size={12} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="detail-panel__file-input"
          onChange={handleFileSelect}
        />

        {showFiles && (
          <div className="detail-panel__files-drawer">
            {/* Link form */}
            {addMode === 'link' && (
              <form className="detail-panel__link-form" onSubmit={handleAddLink}>
                <input
                  type="text"
                  placeholder="Name"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  autoFocus
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <button type="submit" className="detail-panel__link-submit" disabled={!linkName.trim() || !linkUrl.trim()}>
                  Add
                </button>
                <button type="button" className="detail-panel__link-cancel" onClick={() => { setAddMode(null); setLinkName(''); setLinkUrl('') }}>
                  Cancel
                </button>
              </form>
            )}

            {/* File/link list */}
            {fileAttachments.length === 0 && addMode !== 'link' ? (
              <div className="detail-panel__files-empty">No files or links attached</div>
            ) : (
              <div className="detail-panel__files-list">
                {fileAttachments.map(att => (
                  <div key={att.id} className="detail-panel__file-row">
                    <div className={`detail-panel__file-icon ${att.type === 'link' ? 'detail-panel__file-icon--link' : 'detail-panel__file-icon--file'}`}>
                      {att.type === 'file' && getFileIcon(att.name) === 'image' ? (
                        <img src={att.url} alt={att.name} className="detail-panel__file-thumb" />
                      ) : att.type === 'link' ? (
                        <Link2 size={12} />
                      ) : (
                        <Paperclip size={12} />
                      )}
                    </div>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="detail-panel__file-name"
                    >
                      {att.name}
                      <ExternalLink size={9} />
                    </a>
                    {isOwner(att) && (
                      <button className="detail-panel__file-delete" onClick={() => remove(att.id)} title="Remove">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
