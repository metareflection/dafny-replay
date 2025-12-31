import { useState, useRef, useCallback, useEffect } from 'react'
import App from './dafny/app.js'
import './App.css'

// TikZ export helper functions
function tikzSanitizeNodeName(id) {
  // Node name used in: \node (...) at ...
  // Allow only [A-Za-z0-9_]. Replace others with "_".
  let name = String(id).replace(/[^A-Za-z0-9_]/g, "_");
  if (name.length === 0) name = "n";
  if (/^[0-9]/.test(name)) name = "n_" + name;
  return name;
}

function tikzEscapeLabel(text) {
  // Minimal LaTeX escaping for labels
  return String(text)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([{}_#$%&])/g, "\\$1")
    .replace(/\^/g, "\\^{}")
    .replace(/~/g, "\\~{}");
}

function fmt2(x) {
  // format number with 2 decimals, avoid "-0.00"
  const s = (Math.round(x * 100) / 100).toFixed(2);
  return s === "-0.00" ? "0.00" : s;
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportTikzFromNodes(nodesArr, edgesArr = [], opts = {}) {
  const scalePxPerCm = opts.scalePxPerCm ?? 50;

  // Sort by id for stable output
  const sorted = [...nodesArr].sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const lines = [];
  lines.push("\\pgfdeclarelayer{edgelayer}");
  lines.push("\\pgfsetlayers{edgelayer,main}");
  lines.push("\\begin{tikzpicture}[");
  lines.push("  canon node/.style={draw, fill=white, rounded corners, inner sep=2pt},");
  lines.push("  canon edge/.style={->, >=stealth}");
  lines.push("]");

  // Define nodes on main layer
  for (const n of sorted) {
    const id = String(n.id);
    const name = tikzSanitizeNodeName(id);
    const label = tikzEscapeLabel(id);

    const xCm = n.x / scalePxPerCm;
    const yCm = -n.y / scalePxPerCm;

    lines.push(`\\node[canon node] (${name}) at (${fmt2(xCm)}, ${fmt2(yCm)}) {${label}};`);
  }

  // Draw edges on background layer
  if (edgesArr.length > 0) {
    lines.push("\\begin{pgfonlayer}{edgelayer}");
    for (const e of edgesArr) {
      const fromName = tikzSanitizeNodeName(e.from);
      const toName = tikzSanitizeNodeName(e.to);
      lines.push(`\\draw[canon edge] (${fromName}) -- (${toName});`);
    }
    lines.push("\\end{pgfonlayer}");
  }

  lines.push("\\end{tikzpicture}");
  lines.push(""); // trailing newline

  return lines.join("\n");
}

const INITIAL_NODES = [
  { id: 'A', x: 100, y: 100 },
  { id: 'B', x: 200, y: 120 },
  { id: 'C', x: 300, y: 80 },
  { id: 'D', x: 150, y: 250 },
  { id: 'E', x: 250, y: 270 },
]

const NODE_SIZE = 40
const STORAGE_KEY = 'canon-replay'

// Load from localStorage on startup
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return App.Load(data)
  } catch (e) {
    console.error('Failed to load from storage:', e)
    return null
  }
}

// Save to localStorage
function saveToStorage(history) {
  try {
    const data = App.Serialize(App.GetPresent(history))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save to storage:', e)
  }
}

function CanonApp() {
  // History-based state (supports undo/redo)
  // Try to load from localStorage, fall back to initial nodes
  const [history, setHistory] = useState(() => loadFromStorage() ?? App.Init(INITIAL_NODES))
  const [selected, setSelected] = useState(new Set())
  const [selectedConstraint, setSelectedConstraint] = useState(null)

  // Drag state - tracked separately so intermediate positions aren't in history
  const [dragging, setDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragPos, setDragPos] = useState(null)  // Current drag position { x, y }
  const dragStartPos = useRef(null)  // Position when drag started

  const canvasRef = useRef(null)

  // Get data from history's present model
  const historyNodes = App.GetNodes(history)
  const edges = App.GetEdges(history)
  const constraints = App.GetConstraints(history)

  // Compute display nodes (apply drag position if dragging)
  const nodes = dragPos && dragging
    ? historyNodes.map(n => n.id === dragging ? { ...n, x: dragPos.x, y: dragPos.y } : n)
    : historyNodes

  // Undo/Redo handlers
  const undo = useCallback(() => {
    if (App.CanUndo(history)) {
      setHistory(App.Undo(history))
    }
  }, [history])

  const redo = useCallback(() => {
    if (App.CanRedo(history)) {
      setHistory(App.Redo(history))
    }
  }, [history])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault()
          redo()
        } else {
          e.preventDefault()
          undo()
        }
      }
      // Cmd+Y (alternative redo)
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Save to localStorage whenever history changes
  useEffect(() => {
    saveToStorage(history)
  }, [history])

  // Handle node click for selection toggle
  const handleNodeClick = (e, nodeId) => {
    e.stopPropagation()
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  // Convert client coordinates to SVG viewBox coordinates
  const clientToSvg = (clientX, clientY) => {
    const svg = canvasRef.current
    const rect = svg.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (600 / rect.width),
      y: (clientY - rect.top) * (400 / rect.height),
    }
  }

  // Handle node mousedown for drag
  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation()
    const node = historyNodes.find(n => n.id === nodeId)
    if (!node) return

    const svgCoords = clientToSvg(e.clientX, e.clientY)
    setDragging(nodeId)
    setDragOffset({
      x: svgCoords.x - node.x,
      y: svgCoords.y - node.y,
    })
    setDragPos({ x: node.x, y: node.y })
    dragStartPos.current = { x: node.x, y: node.y }
  }

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e) => {
    if (!dragging) return

    const svgCoords = clientToSvg(e.clientX, e.clientY)
    const newX = svgCoords.x - dragOffset.x
    const newY = svgCoords.y - dragOffset.y
    setDragPos({ x: newX, y: newY })
  }, [dragging, dragOffset])

  // Handle mouse up to end drag and commit to history
  const handleMouseUp = useCallback(() => {
    if (dragging && dragPos) {
      // Only commit if position actually changed
      const start = dragStartPos.current
      if (start && (Math.abs(dragPos.x - start.x) > 1 || Math.abs(dragPos.y - start.y) > 1)) {
        // Dispatch MoveNode action, then apply Canon
        const h1 = App.Dispatch(history, App.MoveNode(dragging, dragPos.x, dragPos.y))
        const h2 = App.Canon(h1)
        setHistory(h2)
      }
      setDragging(null)
      setDragPos(null)
      dragStartPos.current = null
    }
  }, [dragging, dragPos, history])

  // Click on canvas to deselect
  const handleCanvasClick = () => {
    setSelected(new Set())
    setSelectedConstraint(null)
  }

  // Add constraint handlers
  const addAlign = () => {
    if (selected.size < 2) return
    const h1 = App.Dispatch(history, App.AddAlign(Array.from(selected)))
    const h2 = App.Canon(h1)
    setHistory(h2)
  }

  const addEvenSpace = () => {
    if (selected.size < 3) return
    const h1 = App.Dispatch(history, App.AddEvenSpace(Array.from(selected)))
    const h2 = App.Canon(h1)
    setHistory(h2)
  }

  const deleteConstraint = (cid) => {
    const h1 = App.Dispatch(history, App.DeleteConstraint(cid))
    setHistory(h1)
  }

  const addNode = () => {
    const id = String.fromCharCode(65 + historyNodes.length) // A, B, C, ...
    const h1 = App.Dispatch(history, App.AddNode(id, 150 + historyNodes.length * 20, 150 + historyNodes.length * 20))
    setHistory(h1)
  }

  const addEdge = () => {
    if (selected.size !== 2) return
    const [from, to] = Array.from(selected)
    const h1 = App.Dispatch(history, App.AddEdge(from, to))
    setHistory(h1)
  }

  const removeEdge = (from, to) => {
    const h1 = App.Dispatch(history, App.DeleteEdge(from, to))
    setHistory(h1)
  }

  const removeNode = (nodeId) => {
    const h1 = App.Dispatch(history, App.RemoveNode(nodeId))
    setHistory(h1)
    setSelected(prev => {
      const next = new Set(prev)
      next.delete(nodeId)
      return next
    })
  }

  const exportTikz = () => {
    // Get canonicalized model
    const hCanon = App.Canon(history)
    const canonNodes = App.GetNodes(hCanon)
    const canonEdges = App.GetEdges(hCanon)
    // Generate TikZ and download
    const tikz = exportTikzFromNodes(canonNodes, canonEdges, { scalePxPerCm: 50 })
    downloadTextFile("diagram.tex", tikz)
  }

  const exportJson = () => {
    const data = App.Serialize(App.GetPresent(history))
    downloadTextFile("diagram.json", JSON.stringify(data, null, 2))
  }

  const fileInputRef = useRef(null)

  const importJson = () => {
    fileInputRef.current?.click()
  }

  const handleFileImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        const newHistory = App.Load(data, history)
        if (newHistory) {
          setHistory(newHistory)
        } else {
          alert('Invalid diagram file')
        }
      } catch (err) {
        alert('Failed to parse file: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = '' // Reset so same file can be imported again
  }

  // Set up global mouse listeners
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // Render constraint visualization
  const renderConstraintLines = () => {
    return constraints.map(c => {
      const targetNodes = c.targets.map(id => nodes.find(n => n.id === id)).filter(Boolean)
      if (targetNodes.length < 2) return null
      const isSelected = selectedConstraint === c.cid

      if (c.type === 'Align') {
        // Draw a line through aligned nodes
        const axis = c.axis
        if (axis === 'X') {
          // Vertical alignment - draw vertical line
          const avgX = targetNodes.reduce((s, n) => s + n.x, 0) / targetNodes.length
          const minY = Math.min(...targetNodes.map(n => n.y)) - 20
          const maxY = Math.max(...targetNodes.map(n => n.y)) + 20
          return (
            <line
              key={`align-${c.cid}`}
              x1={avgX} y1={minY} x2={avgX} y2={maxY}
              className={`constraint-line align ${isSelected ? 'selected' : ''}`}
            />
          )
        } else {
          // Horizontal alignment - draw horizontal line
          const avgY = targetNodes.reduce((s, n) => s + n.y, 0) / targetNodes.length
          const minX = Math.min(...targetNodes.map(n => n.x)) - 20
          const maxX = Math.max(...targetNodes.map(n => n.x)) + 20
          return (
            <line
              key={`align-${c.cid}`}
              x1={minX} y1={avgY} x2={maxX} y2={avgY}
              className={`constraint-line align ${isSelected ? 'selected' : ''}`}
            />
          )
        }
      } else if (c.type === 'EvenSpace') {
        // Draw connecting lines between evenly spaced nodes
        const sorted = [...targetNodes].sort((a, b) =>
          c.axis === 'X' ? a.x - b.x : a.y - b.y
        )
        return (
          <g key={`space-${c.cid}`}>
            {sorted.slice(0, -1).map((n, i) => (
              <line
                key={`space-${c.cid}-${i}`}
                x1={n.x} y1={n.y}
                x2={sorted[i + 1].x} y2={sorted[i + 1].y}
                className={`constraint-line space ${isSelected ? 'selected' : ''}`}
              />
            ))}
          </g>
        )
      }
      return null
    })
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Canon Replay</h1>
        <span className="subtitle">Verified Diagram Builder</span>
      </header>

      <div className="toolbar">
        <button onClick={undo} disabled={!App.CanUndo(history)} title="Undo (Cmd+Z)">
          Undo
        </button>
        <button onClick={redo} disabled={!App.CanRedo(history)} title="Redo (Cmd+Shift+Z)">
          Redo
        </button>
        <span className="separator">|</span>
        <button onClick={addNode}>+ Node</button>
        <button onClick={addEdge} disabled={selected.size !== 2}>
          + Edge ({selected.size})
        </button>
        <button onClick={addAlign} disabled={selected.size < 2}>
          Align ({selected.size})
        </button>
        <button onClick={addEvenSpace} disabled={selected.size < 3}>
          Even Space ({selected.size})
        </button>
        <span className="separator">|</span>
        <button onClick={importJson}>Import</button>
        <button onClick={exportJson}>Export</button>
        <button onClick={exportTikz}>Export TikZ</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileImport}
        />
      </div>

      <div className="main">
        <div className="canvas-container" onClick={handleCanvasClick}>
          <svg
            ref={canvasRef}
            className="canvas"
            viewBox="0 0 600 400"
          >
            {/* Arrow marker for edges */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
              </marker>
            </defs>

            {/* Constraint visualization */}
            {renderConstraintLines()}

            {/* Edges */}
            {edges.map((e, i) => {
              const fromNode = nodes.find(n => n.id === e.from)
              const toNode = nodes.find(n => n.id === e.to)
              if (!fromNode || !toNode) return null
              // Shorten line so arrow tip ends at node edge
              const dx = toNode.x - fromNode.x
              const dy = toNode.y - fromNode.y
              const len = Math.sqrt(dx * dx + dy * dy)
              if (len === 0) return null
              const offset = NODE_SIZE / 2 + 2 // half node + small gap
              const x2 = toNode.x - (dx / len) * offset
              const y2 = toNode.y - (dy / len) * offset
              return (
                <line
                  key={`edge-${e.from}-${e.to}-${i}`}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={x2}
                  y2={y2}
                  className="edge-line"
                  markerEnd="url(#arrowhead)"
                />
              )
            })}

            {/* Nodes */}
            {nodes.map(node => (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onClick={(e) => handleNodeClick(e, node.id)}
                className={`node ${selected.has(node.id) ? 'selected' : ''} ${dragging === node.id ? 'dragging' : ''}`}
              >
                <rect
                  x={-NODE_SIZE / 2}
                  y={-NODE_SIZE / 2}
                  width={NODE_SIZE}
                  height={NODE_SIZE}
                  className="node-rect"
                />
                <text className="node-label">{node.id}</text>
              </g>
            ))}
          </svg>
        </div>

        <aside className="sidebar">
          <section className="panel">
            <h3>Nodes</h3>
            <ul className="node-list">
              {historyNodes.map(node => (
                <li
                  key={node.id}
                  className={selected.has(node.id) ? 'selected' : ''}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelected(prev => {
                      const next = new Set(prev)
                      if (next.has(node.id)) {
                        next.delete(node.id)
                      } else {
                        next.add(node.id)
                      }
                      return next
                    })
                  }}
                >
                  <span className="node-info">
                    <strong>{node.id}</strong>
                    <span className="coords">({Math.round(node.x)}, {Math.round(node.y)})</span>
                  </span>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}>x</button>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h3>Edges</h3>
            {edges.length === 0 ? (
              <p className="empty">No edges</p>
            ) : (
              <ul className="edge-list">
                {edges.map((e, i) => (
                  <li key={`${e.from}-${e.to}-${i}`}>
                    <span className="edge-info">
                      <strong>{e.from}</strong> → <strong>{e.to}</strong>
                    </span>
                    <button className="delete-btn" onClick={() => removeEdge(e.from, e.to)}>x</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <h3>Constraints</h3>
            {constraints.length === 0 ? (
              <p className="empty">No constraints</p>
            ) : (
              <ul className="constraint-list">
                {constraints.map(c => (
                  <li
                    key={c.cid}
                    className={selectedConstraint === c.cid ? 'selected' : ''}
                    onClick={() => setSelectedConstraint(prev => prev === c.cid ? null : c.cid)}
                  >
                    <span className="constraint-info">
                      <span className={`badge ${c.type.toLowerCase()}`}>{c.type}</span>
                      <span className="axis">{c.axis}</span>
                      <span className="targets">{c.targets.join(', ')}</span>
                    </span>
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteConstraint(c.cid) }}>x</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </aside>
      </div>
    </div>
  )
}

export default CanonApp
