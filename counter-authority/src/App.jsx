import { useState, useEffect, useCallback } from 'react'
import './App.css'

const API_BASE = '/api'

function Counter() {
  // Client state: current version and value (synced from server)
  const [ver, setVer] = useState(0)
  const [value, setValue] = useState(0)
  const [status, setStatus] = useState('syncing...')
  const [error, setError] = useState(null)

  // Sync with server
  const sync = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sync`)
      const data = await res.json()
      setVer(data.ver)
      setValue(data.present)
      setStatus('synced')
      setError(null)
    } catch (e) {
      setStatus('error')
      setError('Failed to sync with server')
    }
  }, [])

  // Initial sync
  useEffect(() => {
    sync()
  }, [sync])

  // Dispatch action to server
  const dispatch = async (action) => {
    setStatus('sending...')
    try {
      const res = await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientVer: ver, action })
      })
      const data = await res.json()

      if (data.status === 'success') {
        setVer(data.ver)
        setValue(data.present)
        setStatus('synced')
        setError(null)
      } else if (data.status === 'stale') {
        setStatus('stale - resyncing...')
        setError('Version was stale, resyncing...')
        await sync()
      } else if (data.status === 'invalid') {
        setVer(data.ver)
        setStatus('invalid action')
        setError(data.msg)
      }
    } catch (e) {
      setStatus('error')
      setError('Failed to dispatch action')
    }
  }

  const inc = () => dispatch('Inc')
  const dec = () => dispatch('Dec')

  return (
    <>
      <h1>Dafny Authority Demo</h1>
      <p className="subtitle">Verified server-authoritative state</p>

      <div className="card">
        <div className="version">Version: {ver}</div>
        <div className="value">{value}</div>

        <div className="button-row">
          <button onClick={dec}>Dec</button>
          <button onClick={inc}>Inc</button>
        </div>

        <div className="button-row">
          <button onClick={sync}>Sync</button>
        </div>
      </div>

      <div className={`status ${error ? 'error' : ''}`}>
        Status: {status}
        {error && <div className="error-msg">{error}</div>}
      </div>

      <p className="info">
        Server owns authoritative state, client syncs via protocol.
        <br />
        The invariant (value &gt;= 0) is verified at compile time.
        <br />
        Stale versions are rejected; invalid actions show error.
      </p>
    </>
  )
}

export default Counter
