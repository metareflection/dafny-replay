import { useState, useRef } from 'react'
import App from './dafny/app.ts'
import './App.css'

function Card({ id, title, onDragStart, onDragEnd, onDragOver, onDragLeave, dropPosition }) {
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const position = e.clientY < midpoint ? 'before' : 'after'
    onDragOver(id, position)
  }

  return (
    <div
      className={`card ${dropPosition === 'before' ? 'drop-before' : ''} ${dropPosition === 'after' ? 'drop-after' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, id)}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="card-id">#{id}</div>
      <div className="card-title">{title}</div>
    </div>
  )
}

function Column({ name, cards, wip, model, onAddCard, onDrop }) {
  const [newCardTitle, setNewCardTitle] = useState('')
  const [dropTarget, setDropTarget] = useState(null) // { cardId, position: 'before' | 'after' }
  const count = cards.length
  const atLimit = count >= wip

  const handleAddCard = (e) => {
    e.preventDefault()
    if (newCardTitle.trim()) {
      onAddCard(name, newCardTitle.trim())
      setNewCardTitle('')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const cardId = parseInt(e.dataTransfer.getData('cardId'), 10)

    let pos
    if (dropTarget) {
      const targetIndex = cards.indexOf(dropTarget.cardId)
      if (dropTarget.position === 'before') {
        pos = targetIndex
      } else {
        pos = targetIndex + 1
      }
    } else {
      pos = cards.length
    }

    onDrop(cardId, name, pos)
    setDropTarget(null)
  }

  const handleCardDragOver = (cardId, position) => {
    setDropTarget({ cardId, position })
  }

  const handleCardDragLeave = () => {
    // Don't clear immediately - let dragover on another card set new target
  }

  const handleColumnDragLeave = (e) => {
    // Only clear if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null)
    }
  }

  return (
    <div
      className="column"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleColumnDragLeave}
    >
      <div className="column-header">
        <h3>{name}</h3>
        <span className={`wip-badge ${atLimit ? 'at-limit' : ''}`}>
          {count}/{wip}
        </span>
      </div>
      <div className="cards">
        {cards.map((cardId) => (
          <Card
            key={cardId}
            id={cardId}
            title={App.GetCardTitle(model, cardId)}
            onDragStart={(e, id) => {
              e.dataTransfer.setData('cardId', id.toString())
              e.target.classList.add('dragging')
            }}
            onDragEnd={(e) => {
              e.target.classList.remove('dragging')
              setDropTarget(null)
            }}
            onDragOver={handleCardDragOver}
            onDragLeave={handleCardDragLeave}
            dropPosition={dropTarget?.cardId === cardId ? dropTarget.position : null}
          />
        ))}
      </div>
      {!atLimit && (
        <form className="add-card-form" onSubmit={handleAddCard}>
          <input
            type="text"
            placeholder="New card..."
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
          />
          <button type="submit" disabled={!newCardTitle.trim()}>
            Add Card
          </button>
        </form>
      )}
    </div>
  )
}

function KanbanBoard() {
  const [h, setH] = useState(() => App.Init())
  const [newColName, setNewColName] = useState('')
  const [newColLimit, setNewColLimit] = useState(5)

  const model = App.Present(h)
  const cols = App.GetCols(model)

  const dispatch = (action) => setH(App.Dispatch(h, action))
  const undo = () => setH(App.Undo(h))
  const redo = () => setH(App.Redo(h))

  const handleAddColumn = (e) => {
    e.preventDefault()
    if (newColName.trim() && !cols.includes(newColName.trim())) {
      dispatch(App.AddColumn(newColName.trim(), newColLimit))
      setNewColName('')
    }
  }

  const handleAddCard = (col, title) => {
    dispatch(App.AddCard(col, title))
  }

  const handleMoveCard = (cardId, toCol, pos) => {
    dispatch(App.MoveCard(cardId, toCol, pos))
  }

  return (
    <>
      <div className="header">
        <div>
          <h1>Kanban Board</h1>
          <p className="subtitle">Verified with Dafny - WIP limits enforced</p>
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

      <form className="add-column-form" onSubmit={handleAddColumn}>
        <input
          type="text"
          placeholder="Column name..."
          value={newColName}
          onChange={(e) => setNewColName(e.target.value)}
        />
        <input
          type="number"
          placeholder="WIP"
          min="1"
          value={newColLimit}
          onChange={(e) => setNewColLimit(parseInt(e.target.value, 10) || 1)}
        />
        <button type="submit" disabled={!newColName.trim() || cols.includes(newColName.trim())}>
          Add Column
        </button>
      </form>

      {cols.length === 0 ? (
        <div className="empty-board">
          <p>No columns yet. Add a column to get started!</p>
        </div>
      ) : (
        <div className="board">
          {cols.map((col) => (
            <Column
              key={col}
              name={col}
              cards={App.GetLane(model, col)}
              wip={App.GetWip(model, col)}
              model={model}
              onAddCard={handleAddCard}
              onDrop={handleMoveCard}
            />
          ))}
        </div>
      )}

      <p className="info">
        React owns rendering, Dafny owns state transitions.
        <br />
        WIP limits and card partition invariants are verified at compile time.
      </p>
    </>
  )
}

export default KanbanBoard
