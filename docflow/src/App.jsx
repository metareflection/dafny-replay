import { useState, useCallback } from 'react';
import {
  createDocFlow,
  setField,
  getField,
  validate,
  validTransition,
  transition,
  addReviewer,
  isTerminal,
} from '../docflow.ts';
import './App.css';

const RULES = [
  { field: 'title', constraints: [{ type: 'Required' }, { type: 'MinLength', min: 3 }] },
  { field: 'category', constraints: [{ type: 'Required' }, { type: 'OneOf', allowed: ['Report', 'Memo', 'Policy'] }] },
  { field: 'content', constraints: [{ type: 'Required' }, { type: 'MinLength', min: 10 }] },
];

const STATES = ['Draft', 'Submitted', 'InReview', 'Approved', 'Published'];
const REJECT_BRANCH = ['Rejected'];

function stateIndex(state) {
  const i = STATES.indexOf(state);
  return i >= 0 ? i : -1;
}

function Pipeline({ state }) {
  const current = stateIndex(state);
  const isRejected = state === 'Rejected';

  return (
    <div className="pipeline">
      {STATES.map((s, i) => {
        let cls = 'pipeline-step';
        if (s === state) cls += ' active';
        else if (current > i) cls += ' done';
        if (isRejected && s === 'Draft') cls = 'pipeline-step active';
        return <div key={s} className={cls}>{s}</div>;
      })}
      {isRejected && (
        <div className="pipeline-step active">Rejected</div>
      )}
    </div>
  );
}

function FormFields({ flow, onChange, errors, disabled }) {
  const errorMap = {};
  for (const e of errors) {
    if (!errorMap[e.field]) errorMap[e.field] = [];
    errorMap[e.field].push(e.message);
  }

  return (
    <div className="form-section">
      <h2>Document</h2>

      <div className={`field ${errorMap.title ? 'has-error' : ''}`}>
        <label>Title</label>
        <input
          type="text"
          value={getField(flow, 'title') ?? ''}
          onChange={e => onChange('title', e.target.value || null)}
          disabled={disabled}
          placeholder="Document title"
        />
        {errorMap.title?.map((m, i) => <div key={i} className="field-error">{m}</div>)}
      </div>

      <div className={`field ${errorMap.category ? 'has-error' : ''}`}>
        <label>Category</label>
        <select
          value={getField(flow, 'category') ?? ''}
          onChange={e => onChange('category', e.target.value || null)}
          disabled={disabled}
        >
          <option value="">Select category</option>
          <option value="Report">Report</option>
          <option value="Memo">Memo</option>
          <option value="Policy">Policy</option>
        </select>
        {errorMap.category?.map((m, i) => <div key={i} className="field-error">{m}</div>)}
      </div>

      <div className={`field ${errorMap.content ? 'has-error' : ''}`}>
        <label>Content</label>
        <textarea
          value={getField(flow, 'content') ?? ''}
          onChange={e => onChange('content', e.target.value || null)}
          disabled={disabled}
          placeholder="Document content"
        />
        {errorMap.content?.map((m, i) => <div key={i} className="field-error">{m}</div>)}
      </div>
    </div>
  );
}

function ReviewerSection({ flow, onAdd, disabled }) {
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name.trim());
      setName('');
    }
  };

  return (
    <div className="form-section">
      <h2>Reviewers</h2>
      <div style={{ marginBottom: 12 }}>
        {flow.doc.reviewers.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No reviewers added</span>
        )}
        {flow.doc.reviewers.map((r, i) => (
          <span key={i} className="reviewer-tag">{r}</span>
        ))}
      </div>
      {!disabled && (
        <div className="reviewer-row">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Reviewer name"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn" onClick={handleAdd} disabled={!name.trim()}>Add</button>
        </div>
      )}
    </div>
  );
}

function EventLog({ log }) {
  if (log.length === 0) return null;
  return (
    <div className="log">
      <h2>History</h2>
      {log.map((entry, i) => (
        <div key={i} className="log-entry">
          <span className="log-num">{i + 1}</span>
          <span>{entry.action}</span>
          <span className="log-state">{entry.state}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [flow, setFlow] = useState(() => createDocFlow(RULES));
  const [errors, setErrors] = useState([]);
  const [banner, setBanner] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [log, setLog] = useState([{ action: 'Created', state: 'Draft' }]);

  const state = flow.doc.state;
  const terminal = isTerminal(flow);
  const formDisabled = state !== 'Draft' && state !== 'Rejected';

  const handleFieldChange = useCallback((field, value) => {
    setFlow(f => setField(f, field, value));
    setErrors([]);
    setBanner(null);
  }, []);

  const handleTransition = useCallback((t) => {
    const result = transition(flow, t);
    if (result.ok) {
      setFlow(result.flow);
      setErrors([]);
      setBanner({ type: 'success', message: `Transitioned to ${result.flow.doc.state}` });
      setActionError(null);
      setLog(l => [...l, { action: t, state: result.flow.doc.state }]);
    } else if (result.reason) {
      setErrors([]);
      setBanner({ type: 'error', message: result.reason });
      setActionError(result.reason);
    } else {
      setErrors(result.errors);
      setBanner({ type: 'error', message: `Validation failed — ${result.errors.length} error${result.errors.length > 1 ? 's' : ''}` });
      setActionError(null);
    }
  }, [flow]);

  const handleAddReviewer = useCallback((name) => {
    setFlow(f => addReviewer(f, name));
    setLog(l => [...l, { action: `Added reviewer: ${name}`, state: flow.doc.state }]);
  }, [flow.doc.state]);

  const handleReset = useCallback(() => {
    setFlow(createDocFlow(RULES));
    setErrors([]);
    setBanner(null);
    setLog([{ action: 'Created', state: 'Draft' }]);
  }, []);

  const ALL_TRANSITIONS = [
    { t: 'Submit', label: 'Submit', primary: true },
    { t: 'BeginReview', label: 'Begin Review' },
    { t: 'Approve', label: 'Approve' },
    { t: 'Reject', label: 'Reject' },
    { t: 'Publish', label: 'Publish', primary: true },
    { t: 'Revise', label: 'Revise' },
  ];

  // Only show transitions valid from the current state
  const available = ALL_TRANSITIONS.filter(({ t }) => validTransition(flow, t));

  return (
    <div className="app">
      <div className="header">
        <h1>DocFlow</h1>
        <p>Document review workflow — verified with Dafny</p>
      </div>

      <Pipeline state={state} />

      {banner && (
        <div className={`banner ${banner.type === 'error' ? 'banner-error' : 'banner-success'}`}>
          {banner.message}
        </div>
      )}

      <FormFields
        flow={flow}
        onChange={handleFieldChange}
        errors={errors.filter(e => e.field !== '_workflow')}
        disabled={formDisabled}
      />

      <ReviewerSection
        flow={flow}
        onAdd={handleAddReviewer}
        disabled={terminal}
      />

      <div className="actions">
        {available.map(({ t, label, primary }) => (
          <button
            key={t}
            className={`btn ${primary ? 'btn-primary' : ''}`}
            onClick={() => handleTransition(t)}
          >
            {label}
          </button>
        ))}
        <button className="btn" onClick={handleReset} style={{ marginLeft: 'auto' }}>
          Reset
        </button>
      </div>
      {actionError && (
        <div className="action-error">{actionError}</div>
      )}

      <EventLog log={log} />

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <span className="verified-badge">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 0L7.5 1.5L9.5 1L10 3L12 3.5L11.5 5.5L12.5 7.5L11 8.5L11 10.5L9 10.5L7.5 12L6 10.5L4.5 12L3 10.5L1 10.5L1 8.5L-0.5 7.5L0.5 5.5L0 3.5L2 3L2.5 1L4.5 1.5L6 0Z" fill="currentColor"/>
            <path d="M4.5 6L5.5 7L7.5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Workflow + Validation verified with Dafny
        </span>
      </div>
    </div>
  );
}
