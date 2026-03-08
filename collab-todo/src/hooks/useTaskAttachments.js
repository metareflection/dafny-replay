import { useState, useEffect, useCallback } from 'react'
import { backend } from '../backend/index.ts'

export function useTaskAttachments(projectId, taskId) {
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!projectId || taskId == null) {
      setAttachments([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await backend.attachments.list(projectId, taskId)
      setAttachments(data)
    } catch (err) {
      console.error('Failed to load attachments:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId, taskId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const addFile = useCallback(async (file) => {
    try {
      const attachment = await backend.attachments.uploadFile(projectId, taskId, file)
      setAttachments(prev => [attachment, ...prev])
      return attachment
    } catch (err) {
      console.error('Failed to upload file:', err)
      setError(err.message)
      throw err
    }
  }, [projectId, taskId])

  const addLink = useCallback(async (name, url) => {
    try {
      const attachment = await backend.attachments.addLink(projectId, taskId, name, url)
      setAttachments(prev => [attachment, ...prev])
      return attachment
    } catch (err) {
      console.error('Failed to add link:', err)
      setError(err.message)
      throw err
    }
  }, [projectId, taskId])

  const addMarkdown = useCallback(async (name, content) => {
    try {
      const attachment = await backend.attachments.addMarkdown(projectId, taskId, name, content)
      setAttachments(prev => [attachment, ...prev])
      return attachment
    } catch (err) {
      console.error('Failed to add markdown:', err)
      setError(err.message)
      throw err
    }
  }, [projectId, taskId])

  const updateMarkdown = useCallback(async (attachmentId, name, content) => {
    try {
      await backend.attachments.updateMarkdown(attachmentId, name, content)
      setAttachments(prev => prev.map(a =>
        a.id === attachmentId ? { ...a, name, content } : a
      ))
    } catch (err) {
      console.error('Failed to update markdown:', err)
      setError(err.message)
      throw err
    }
  }, [])

  const remove = useCallback(async (attachmentId) => {
    try {
      await backend.attachments.remove(attachmentId)
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (err) {
      console.error('Failed to remove attachment:', err)
      setError(err.message)
      throw err
    }
  }, [])

  return {
    attachments,
    loading,
    error,
    refresh: fetch,
    addFile,
    addLink,
    addMarkdown,
    updateMarkdown,
    remove
  }
}
