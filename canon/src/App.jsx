import { useState, useRef, useCallback, useEffect } from 'react'
import Canon from './dafny/app.js'
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

function exportTikzFromNodes(nodesArr, opts = {}) {
  const scalePxPerCm = opts.scalePxPerCm ?? 50;

  // Sort by id for stable output
  const sorted = [...nodesArr].sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const lines = [];
  lines.push("\\begin{tikzpicture}[");
  lines.push("  canon node/.style={draw, rounded corners, inner sep=2pt}");
  lines.push("]");

  for (const n of sorted) {
    const id = String(n.id);
    const name = tikzSanitizeNodeName(id);
    const label = tikzEscapeLabel(id);

    const xCm = n.x / scalePxPerCm;
    const yCm = -n.y / scalePxPerCm;

    lines.push(`\\node[canon node] (${name}) at (${fmt2(xCm)}, ${fmt2(yCm)}) {${label}};`);
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

function App() {
  const [model, setModel] = useState(() => Canon.Init(INITIAL_NODES))
  const [selected, setSelected] = useState(new Set())
  const [dragging, setDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef(null)

  const nodes = Canon.GetNodes(model)
  const constraints = Canon.GetConstraints(model)

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

  // Handle node mousedown for drag
  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation()
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    setDragging(nodeId)
    setDragOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y,
    })
  }

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e) => {
    if (!dragging) return

    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y

    // Update node position directly during drag
    const updatedNodes = nodes.map(n =>
      n.id === dragging ? { ...n, x: newX, y: newY } : n
    )
    const newModel = Canon.SetNodes(model, updatedNodes)
    setModel(newModel)
  }, [dragging, dragOffset, nodes, model])

  // Handle mouse up to end drag and canonicalize
  const handleMouseUp = useCallback(() => {
    if (dragging) {
      // Apply Canon on mouse-up to re-satisfy constraints
      setModel(prev => Canon.Canon(prev))
      setDragging(null)
    }
  }, [dragging])

  // Click on canvas to deselect
  const handleCanvasClick = () => {
    setSelected(new Set())
  }

  // Add constraint handlers
  const addAlign = () => {
    if (selected.size < 2) return
    const m1 = Canon.AddAlign(model, Array.from(selected))
    const m2 = Canon.Canon(m1)
    setModel(m2)
  }

  const addEvenSpace = () => {
    if (selected.size < 3) return
    const m1 = Canon.AddEvenSpace(model, Array.from(selected))
    const m2 = Canon.Canon(m1)
    setModel(m2)
  }

  const deleteConstraint = (cid) => {
    setModel(Canon.DeleteConstraint(model, cid))
  }

  const addNode = () => {
    const id = String.fromCharCode(65 + nodes.length) // A, B, C, ...
    const newNode = { id, x: 150 + nodes.length * 20, y: 150 + nodes.length * 20 }
    const updatedNodes = [...nodes, newNode]
    setModel(Canon.Init(updatedNodes))
  }

  const removeNode = (nodeId) => {
    const m1 = Canon.RemoveNode(model, nodeId)
    setModel(m1)
    setSelected(prev => {
      const next = new Set(prev)
      next.delete(nodeId)
      return next
    })
  }

  const exportTikz = () => {
    // Get canonicalized model
    const mCanon = Canon.Canon(model)
    const canonNodes = Canon.GetNodes(mCanon)
    // Generate TikZ and download
    const tikz = exportTikzFromNodes(canonNodes, { scalePxPerCm: 50 })
    downloadTextFile("diagram.tex", tikz)
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
              className="constraint-line align"
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
              className="constraint-line align"
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
                className="constraint-line space"
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
        <h1>Canon</h1>
        <span className="subtitle">Verified Diagram Builder</span>
      </header>

      <div className="toolbar">
        <button onClick={addNode}>+ Node</button>
        <button onClick={addAlign} disabled={selected.size < 2}>
          Align ({selected.size})
        </button>
        <button onClick={addEvenSpace} disabled={selected.size < 3}>
          Even Space ({selected.size})
        </button>
        <button onClick={exportTikz}>Export TikZ</button>
      </div>

      <div className="main">
        <div className="canvas-container" onClick={handleCanvasClick}>
          <svg
            ref={canvasRef}
            className="canvas"
            viewBox="0 0 600 400"
          >
            {/* Constraint visualization */}
            {renderConstraintLines()}

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
              {nodes.map(node => (
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
            <h3>Constraints</h3>
            {constraints.length === 0 ? (
              <p className="empty">No constraints</p>
            ) : (
              <ul className="constraint-list">
                {constraints.map(c => (
                  <li key={c.cid}>
                    <span className="constraint-info">
                      <span className={`badge ${c.type.toLowerCase()}`}>{c.type}</span>
                      <span className="axis">{c.axis}</span>
                      <span className="targets">{c.targets.join(', ')}</span>
                    </span>
                    <button className="delete-btn" onClick={() => deleteConstraint(c.cid)}>x</button>
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

export default App
