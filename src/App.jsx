import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'todo-app.tasks'
const FILTERS = ['all', 'active', 'completed']

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function App() {
  const [tasks, setTasks] = useState(loadTasks)
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const visible = useMemo(() => {
    if (filter === 'active') return tasks.filter((task) => !task.done)
    if (filter === 'completed') return tasks.filter((task) => task.done)
    return tasks
  }, [tasks, filter])

  const remaining = tasks.filter((task) => !task.done).length
  const completedCount = tasks.length - remaining

  function addTask(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setTasks((current) => [
      { id: crypto.randomUUID(), text, done: false },
      ...current,
    ])
    setDraft('')
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    )
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id))
    if (editingId === id) setEditingId(null)
  }

  function startEdit(task) {
    setEditingId(task.id)
    setEditText(task.text)
  }

  function saveEdit(id) {
    const text = editText.trim()
    if (!text) {
      deleteTask(id)
      return
    }
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, text } : task)),
    )
    setEditingId(null)
  }

  function clearCompleted() {
    setTasks((current) => current.filter((task) => !task.done))
  }

  return (
    <div className="page">
      <header className="header">
        <p className="eyebrow">Today</p>
        <h1>Todo</h1>
        <p className="lede">
          {remaining === 0
            ? 'Nothing waiting. Add something when you are ready.'
            : `${remaining} ${remaining === 1 ? 'task' : 'tasks'} still open.`}
        </p>
      </header>

      <form className="composer" onSubmit={addTask}>
        <label className="sr-only" htmlFor="new-task">
          New task
        </label>
        <input
          id="new-task"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="What needs doing?"
          autoComplete="off"
        />
        <button type="submit">Add</button>
      </form>

      <div className="toolbar">
        <div className="filters" role="tablist" aria-label="Filter tasks">
          {FILTERS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={filter === name}
              className={filter === name ? 'active' : ''}
              onClick={() => setFilter(name)}
            >
              {name}
            </button>
          ))}
        </div>
        {completedCount > 0 && (
          <button type="button" className="ghost" onClick={clearCompleted}>
            Clear completed
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="empty">
          {tasks.length === 0
            ? 'Your list is empty.'
            : filter === 'completed'
              ? 'No completed tasks yet.'
              : 'No open tasks.'}
        </p>
      ) : (
        <ul className="list">
          {visible.map((task) => (
            <li key={task.id} className={task.done ? 'done' : ''}>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task.id)}
                aria-label={`Mark “${task.text}” as ${task.done ? 'open' : 'done'}`}
              />
              {editingId === task.id ? (
                <input
                  className="edit"
                  value={editText}
                  onChange={(event) => setEditText(event.target.value)}
                  onBlur={() => saveEdit(task.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') saveEdit(task.id)
                    if (event.key === 'Escape') setEditingId(null)
                  }}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className="text"
                  onDoubleClick={() => startEdit(task)}
                >
                  {task.text}
                </button>
              )}
              <button
                type="button"
                className="icon"
                onClick={() => startEdit(task)}
                aria-label={`Edit “${task.text}”`}
              >
                Edit
              </button>
              <button
                type="button"
                className="icon danger"
                onClick={() => deleteTask(task.id)}
                aria-label={`Delete “${task.text}”`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App
