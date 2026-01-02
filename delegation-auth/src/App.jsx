import { useState } from 'react'
import App from './dafny/app-extras.js'
import './App.css'

function SubjectsPanel({ subjects, onAddSubject }) {
  const [newSubject, setNewSubject] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      onAddSubject(newSubject.trim())
      setNewSubject('')
    }
  }

  return (
    <div className="panel">
      <h2>Subjects</h2>
      <form className="form-row" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Subject name..."
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
        />
        <button type="submit" disabled={!newSubject.trim() || subjects.includes(newSubject.trim())}>
          Add Subject
        </button>
      </form>
      <div className="list">
        {subjects.length === 0 ? (
          <div className="empty-message">No subjects yet</div>
        ) : (
          subjects.map((s) => (
            <div key={s} className="list-item">
              <span className="content">{s}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function GrantsPanel({ subjects, grants, onGrant }) {
  const [subject, setSubject] = useState('')
  const [capability, setCapability] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (subject && capability.trim()) {
      onGrant(subject, capability.trim())
      setCapability('')
    }
  }

  return (
    <div className="panel">
      <h2>Grants</h2>
      <form className="form-row" onSubmit={handleSubmit}>
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">Select subject...</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Capability..."
          value={capability}
          onChange={(e) => setCapability(e.target.value)}
        />
        <button type="submit" disabled={!subject || !capability.trim()}>
          Grant
        </button>
      </form>
      <div className="list">
        {grants.length === 0 ? (
          <div className="empty-message">No grants yet</div>
        ) : (
          grants.map((g, i) => (
            <div key={i} className="list-item">
              <span className="content">
                {g.subject}
                <span className="capability-badge">{g.capability}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function DelegationsPanel({ subjects, delegations, onDelegate, onRevoke }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [capability, setCapability] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (from && to && capability.trim()) {
      onDelegate(from, to, capability.trim())
      setCapability('')
    }
  }

  return (
    <div className="panel">
      <h2>Delegations</h2>
      <form className="form-row" onSubmit={handleSubmit}>
        <select value={from} onChange={(e) => setFrom(e.target.value)}>
          <option value="">From...</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">To...</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Capability..."
          value={capability}
          onChange={(e) => setCapability(e.target.value)}
        />
        <button type="submit" disabled={!from || !to || !capability.trim()}>
          Delegate
        </button>
      </form>
      <div className="list">
        {delegations.length === 0 ? (
          <div className="empty-message">No delegations yet</div>
        ) : (
          delegations.map((d) => (
            <div key={d.id} className="list-item">
              <span className="content">
                <span className="id">#{d.id}</span>
                {d.from}
                <span className="delegation-arrow">-&gt;</span>
                {d.to}
                <span className="capability-badge">{d.cap}</span>
              </span>
              <button onClick={() => onRevoke(d.id)}>Revoke</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function QueryPanel({ subjects, model }) {
  const [querySubject, setQuerySubject] = useState('')
  const [queryCapability, setQueryCapability] = useState('')
  const [queryResult, setQueryResult] = useState(null)

  const handleCheck = () => {
    if (querySubject && queryCapability.trim()) {
      const canAccess = App.CheckCan(model, querySubject, queryCapability.trim())
      const reachable = App.GetReachable(model, queryCapability.trim())
      setQueryResult({ canAccess, reachable, subject: querySubject, capability: queryCapability.trim() })
    }
  }

  return (
    <div className="panel query-panel">
      <h2>Check Access</h2>
      <div className="form-row">
        <select value={querySubject} onChange={(e) => setQuerySubject(e.target.value)}>
          <option value="">Select subject...</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Capability..."
          value={queryCapability}
          onChange={(e) => setQueryCapability(e.target.value)}
        />
        <button onClick={handleCheck} disabled={!querySubject || !queryCapability.trim()}>
          Check
        </button>
      </div>
      {queryResult && (
        <div className={`query-result ${queryResult.canAccess ? 'can-access' : 'no-access'}`}>
          <strong>{queryResult.subject}</strong> {queryResult.canAccess ? 'CAN' : 'CANNOT'} access{' '}
          <strong>{queryResult.capability}</strong>
          {queryResult.reachable.length > 0 && (
            <>
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
                All subjects with {queryResult.capability}:
              </div>
              <div className="reachable-list">
                {queryResult.reachable.map((s) => (
                  <span key={s} className="reachable-item">{s}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function DelegationAuth() {
  const [h, setH] = useState(() => App.Init())

  const model = App.Present(h)
  const subjects = App.GetSubjects(model)
  const grants = App.GetGrants(model)
  const delegations = App.GetDelegations(model)

  const dispatch = (action) => setH(App.Dispatch(h, action))
  const undo = () => setH(App.Undo(h))
  const redo = () => setH(App.Redo(h))

  const handleAddSubject = (s) => dispatch(App.AddSubject(s))
  const handleGrant = (s, cap) => dispatch(App.Grant(s, cap))
  const handleDelegate = (from, to, cap) => dispatch(App.Delegate(from, to, cap))
  const handleRevoke = (eid) => dispatch(App.Revoke(eid))

  return (
    <>
      <div className="header">
        <div>
          <h1>Delegation Auth</h1>
          <p className="subtitle">Verified capability delegation with Dafny</p>
        </div>
        <div className="controls">
          <button onClick={undo} disabled={!App.CanUndo(h)}>
            Undo
          </button>
          <button onClick={redo} disabled={!App.CanRedo(h)}>
            Redo
          </button>
        </div>
      </div>

      <div className="main-content">
        <SubjectsPanel
          subjects={subjects}
          onAddSubject={handleAddSubject}
        />
        <GrantsPanel
          subjects={subjects}
          grants={grants}
          onGrant={handleGrant}
        />
        <DelegationsPanel
          subjects={subjects}
          delegations={delegations}
          onDelegate={handleDelegate}
          onRevoke={handleRevoke}
        />
        <QueryPanel
          subjects={subjects}
          model={model}
        />
      </div>

      <p className="info">
        React owns rendering, Dafny owns state transitions.
        <br />
        Structural invariants (subjects exist, edge ids fresh) are verified at compile time.
      </p>
    </>
  )
}

export default DelegationAuth
