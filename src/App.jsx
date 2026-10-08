import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'todo-app.tasks'
const FILTERS = ['all', 'active', 'completed']
const PRIORITIES = ['high', 'medium', 'low']

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((task) => ({
      id: String(task.id ?? crypto.randomUUID()),
      text: String(task.text ?? ''),
      done: Boolean(task.done),
      priority: PRIORITIES.includes(task.priority) ? task.priority : 'medium',
      due: typeof task.due === 'string' ? task.due : '',
      createdAt: Number(task.createdAt) || Date.now(),
    }))
  } catch {
    return []
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function dueStatus(due, done) {
  if (!due || done) return null
  const today = todayISO()
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  return null
}

function formatDue(due) {
  if (!due) return ''
  const date = new Date(`${due}T00:00:00`)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function App() {
  const [tasks, setTasks] = useState(loadTasks)
  const [draft, setDraft] = useState('')
  const [priority, setPriority] = useState('medium')
  const [due, setDue] = useState('')
  const [filter, setFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('created')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editPriority, setEditPriority] = useState('medium')
  const [editDue, setEditDue] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const remaining = tasks.filter((task) => !task.done).length
  const overdueCount = tasks.filter(
    (task) => dueStatus(task.due, task.done) === 'overdue',
  ).length
  const completedCount = tasks.length - remaining
  const progress = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = tasks.filter((task) => {
      if (filter === 'active' && task.done) return false
      if (filter === 'completed' && !task.done) return false
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false
      }
      if (needle && !task.text.toLowerCase().includes(needle)) return false
      return true
    })

    const rank = { high: 0, medium: 1, low: 2 }
    return [...filtered].sort((a, b) => {
      if (sort === 'priority') {
        return rank[a.priority] - rank[b.priority] || b.createdAt - a.createdAt
      }
      if (sort === 'due') {
        if (!a.due && !b.due) return b.createdAt - a.createdAt
        if (!a.due) return 1
        if (!b.due) return -1
        return a.due.localeCompare(b.due) || b.createdAt - a.createdAt
      }
      return b.createdAt - a.createdAt
    })
  }, [tasks, filter, priorityFilter, query, sort])

  function addTask(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setTasks((current) => [
      {
        id: crypto.randomUUID(),
        text,
        done: false,
        priority,
        due,
        createdAt: Date.now(),
      },
      ...current,
    ])
    setDraft('')
    setPriority('medium')
    setDue('')
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
    setEditPriority(task.priority)
    setEditDue(task.due)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function saveEdit(id) {
    const text = editText.trim()
    if (!text) return
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, text, priority: editPriority, due: editDue }
          : task,
      ),
    )
    setEditingId(null)
  }

  function clearCompleted() {
    setTasks((current) => current.filter((task) => !task.done))
  }

  return (
    <div className="page">
      <header className="header">
        <p className="eyebrow">Task manager</p>
        <h1>What needs doing</h1>
        <p className="lede">
          {tasks.length === 0
            ? 'Add a task with a priority and optional due date.'
            : `${remaining} open${overdueCount ? ` · ${overdueCount} overdue` : ''}${completedCount ? ` · ${completedCount} done` : ''}`}
        </p>
        {tasks.length > 0 && (
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Tasks completed"
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
      </header>

      <form className="composer" onSubmit={addTask}>
        <label className="sr-only" htmlFor="new-task">
          New task
        </label>
        <input
          id="new-task"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a task…"
          autoComplete="off"
        />
        <label className="sr-only" htmlFor="new-priority">
          Priority
        </label>
        <select
          id="new-priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
        >
          {PRIORITIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="new-due">
          Due date
        </label>
        <input
          id="new-due"
          type="date"
          value={due}
          onChange={(event) => setDue(event.target.value)}
        />
        <button type="submit" disabled={!draft.trim()}>
          Add
        </button>
      </form>

      <div className="controls">
        <label className="sr-only" htmlFor="search">
          Search tasks
        </label>
        <input
          id="search"
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
        />
        <label className="field">
          <span>Priority</span>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          >
            <option value="all">all</option>
            {PRIORITIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="created">newest</option>
            <option value="due">due date</option>
            <option value="priority">priority</option>
          </select>
        </label>
      </div>

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
            : 'Nothing matches these filters.'}
        </p>
      ) : (
        <ul className="list">
          {visible.map((task) => {
            const status = dueStatus(task.due, task.done)
            const editing = editingId === task.id
            return (
              <li key={task.id} className={task.done ? 'done' : ''}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  aria-label={`Mark “${task.text}” as ${task.done ? 'open' : 'done'}`}
                />
                {editing ? (
                  <form
                    className="edit-row"
                    onSubmit={(event) => {
                      event.preventDefault()
                      saveEdit(task.id)
                    }}
                  >
                    <input
                      className="edit"
                      value={editText}
                      onChange={(event) => setEditText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                    <select
                      value={editPriority}
                      onChange={(event) => setEditPriority(event.target.value)}
                    >
                      {PRIORITIES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={editDue}
                      onChange={(event) => setEditDue(event.target.value)}
                    />
                    <button type="submit" disabled={!editText.trim()}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="body">
                    <button
                      type="button"
                      className="text"
                      onDoubleClick={() => startEdit(task)}
                    >
                      {task.text}
                    </button>
                    <div className="meta">
                      <span className={`priority ${task.priority}`}>
                        {task.priority}
                      </span>
                      {task.due && (
                        <span className={status ? `due ${status}` : 'due'}>
                          {status === 'overdue'
                            ? `Overdue · ${formatDue(task.due)}`
                            : status === 'today'
                              ? 'Due today'
                              : formatDue(task.due)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="actions">
                  {!editing && (
                    <button
                      type="button"
                      className="icon"
                      onClick={() => startEdit(task)}
                      aria-label={`Edit “${task.text}”`}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon danger"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Delete “${task.text}”`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default App
