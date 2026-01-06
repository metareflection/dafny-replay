import { useState } from 'react'
import App from './dafny/app.ts'
import './App.css'

function Counter() {
  // Store the Dafny History in React state
  const [h, setH] = useState(() => App.Init())

  const inc = () => setH(App.Dispatch(h, App.Inc()))
  const dec = () => setH(App.Dispatch(h, App.Dec()))
  const undo = () => setH(App.Undo(h))
  const redo = () => setH(App.Redo(h))

  return (
    <>
      <h1>Dafny Replay Demo</h1>
      <p className="subtitle">Verified, replayable reducer kernel</p>

      <div className="card">
        <div className="value">{App.Present(h)}</div>

        <div className="button-row">
          <button onClick={dec}>Dec</button>
          <button onClick={inc}>Inc</button>
        </div>

        <div className="button-row">
          <button onClick={undo} disabled={!App.CanUndo(h)}>
            Undo
          </button>
          <button onClick={redo} disabled={!App.CanRedo(h)}>
            Redo
          </button>
        </div>
      </div>

      <p className="info">
        React owns rendering, Dafny owns state transitions.
        <br />
        The invariant (value &gt;= 0) is verified at compile time.
      </p>
    </>
  )
}

export default Counter
