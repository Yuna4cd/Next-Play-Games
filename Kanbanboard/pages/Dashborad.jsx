import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import Column from '../components/Column'
import TaskDetails from '../components/TaskDetails'
import TaskModal from '../components/TaskModal'
import {
  fetchTasks,
  insertTask,
  updateTask,
  deleteTask,
  ensureAnonymousSession,
  insertTaskComment,
} from '../src/lib/tasksApi'
import { hasSupabaseConfig } from '../src/lib/supabase'

const priorityOrder = {
  High: 0,
  Medium: 1,
  Low: 2,
  Done: 3,
}

const defaultColumns = [
  { id: 'todo', title: 'To-Do', tone: 'amber' },
  { id: 'in_progress', title: 'In Progress', tone: 'blue' },
  { id: 'in_review', title: 'In Review', tone: 'violet' },
  { id: 'done', title: 'Done', tone: 'green' },
]

function sortTasksByPriority(tasks) {
  return [...tasks].sort((leftTask, rightTask) => {
    const leftPriority = priorityOrder[leftTask.priority] ?? Number.MAX_SAFE_INTEGER
    const rightPriority = priorityOrder[rightTask.priority] ?? Number.MAX_SAFE_INTEGER

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return leftTask.title.localeCompare(rightTask.title)
  })
}

function prettifyStatus(status) {
  return status
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function emptyTaskForm() {
  return {
    title: '',
    description: '',
    assignee: '',
    priority: 'Medium',
    dueDate: '',
    tag: '',
  }
}

function formatAppError(error) {
  const message = error?.message || String(error)

  if (message.toLowerCase().includes('anonymous sign-ins are disabled')) {
    return 'Supabase anonymous auth is disabled. Enable Anonymous Sign-Ins in Supabase Authentication before using persisted tasks.'
  }

  if (message.toLowerCase().includes('auth session missing')) {
    return 'No Supabase session is available. Refresh after enabling anonymous auth or recheck your env configuration.'
  }

  return message
}

function mergeColumns(columnDefinitions, tasks) {
  const statusesFromTasks = tasks
    .map((task) => task.status)
    .filter(Boolean)
    .filter((status, index, statuses) => statuses.indexOf(status) === index)

  const merged = [...columnDefinitions]

  statusesFromTasks.forEach((status) => {
    if (!merged.some((column) => column.id === status)) {
      merged.push({
        id: status,
        title: prettifyStatus(status),
        tone: 'default',
      })
    }
  })

  return merged.map((column) => ({
    ...column,
    tasks: sortTasksByPriority(tasks.filter((task) => task.status === column.id)),
  }))
}

function LoadingColumn({ title, tone = 'default' }) {
  return (
    <section className="column-container column-container--loading" aria-busy="true" aria-live="polite">
      <div className="column-title">
        <div className="column-title__copy">
          <p className={`column-title__dot column-title__dot--${tone}`} />
          <h2>{title}</h2>
        </div>
        <span className="column-title__count">...</span>
      </div>

      <div className="column-tasks">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`${title}-loading-${index}`} className="task-card task-card--skeleton" aria-hidden="true">
            <div className="task-card__skeleton task-card__skeleton--tag" />
            <div className="task-card__skeleton task-card__skeleton--title" />
            <div className="task-card__skeleton task-card__skeleton--title task-card__skeleton--title-short" />
            <div className="task-card__skeleton-row">
              <div className="task-card__skeleton task-card__skeleton--pill" />
              <div className="task-card__skeleton task-card__skeleton--meta" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Toast({ tone = 'error', title, message, onDismiss }) {
  if (!message) {
    return null
  }

  return (
    <div className={`toast toast--${tone}`} role="alert" aria-live={tone === 'error' ? 'assertive' : 'polite'}>
      <div className="toast__content">
        <p className="toast__eyebrow">{title}</p>
        <p className="toast__message">{message}</p>
      </div>
      {onDismiss ? (
        <button className="toast__dismiss" type="button" onClick={onDismiss} aria-label={`Dismiss ${tone} message`}>
          x
        </button>
      ) : null}
    </div>
  )
}

function ConfirmDialog({ isOpen, title, message, confirmLabel, onConfirm, onCancel }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="confirm-dialog__backdrop" onClick={onCancel} />
      <div className="confirm-dialog__panel">
        <p className="confirm-dialog__eyebrow">Confirm Action</p>
        <h2 className="confirm-dialog__title" id="confirm-dialog-title">
          {title}
        </h2>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button className="confirm-dialog__button confirm-dialog__button--ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-dialog__button confirm-dialog__button--danger" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [columnDefinitions, setColumnDefinitions] = useState(defaultColumns)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [filters, setFilters] = useState({
    label: '',
    priority: '',
    assignee: '',
  })
  const [taskModalState, setTaskModalState] = useState({
    isOpen: false,
    columnId: '',
    columnTitle: '',
    formData: emptyTaskForm(),
  })
  const [taskDetailsState, setTaskDetailsState] = useState({
    isOpen: false,
    columnId: '',
    columnTitle: '',
    taskId: '',
    commentDraft: '',
  })
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSavingTask, setIsSavingTask] = useState(false)
  const [deleteConfirmState, setDeleteConfirmState] = useState({
    isOpen: false,
    taskId: '',
    taskTitle: '',
  })

  useEffect(() => {
    let isMounted = true

    async function loadTasks() {
      if (!hasSupabaseConfig) {
        if (isMounted) {
          setIsLoading(false)
        }
        return
      }

      try {
        if (isMounted) {
          setIsLoading(true)
          setLoadError('')
        }
        await ensureAnonymousSession()
        const remoteTasks = await fetchTasks()

        if (!isMounted) {
          return
        }

        setTasks(remoteTasks)
        setLoadError('')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setLoadError(formatAppError(error))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTasks()

    return () => {
      isMounted = false
    }
  }, [])

  const columns = useMemo(() => mergeColumns(columnDefinitions, tasks), [columnDefinitions, tasks])
  const isInitialLoading = hasSupabaseConfig && isLoading && tasks.length === 0

  const filterOptions = useMemo(
    () => ({
      labels: [...new Set(tasks.map((task) => task.tag).filter(Boolean))].sort(),
      priorities: [...new Set(tasks.map((task) => task.priority).filter(Boolean))],
      assignees: [...new Set(tasks.map((task) => task.assignee).filter(Boolean))].sort(),
    }),
    [tasks],
  )

  const normalizedSearch = searchValue.trim().toLowerCase()
  const visibleColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => {
          const matchesSearch =
            !normalizedSearch ||
            [task.title, task.assignee, task.priority, task.tag]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(normalizedSearch))

          const matchesTag = !filters.label || task.tag === filters.label
          const matchesPriority = !filters.priority || task.priority === filters.priority
          const matchesAssignee = !filters.assignee || task.assignee === filters.assignee

          return matchesSearch && matchesTag && matchesPriority && matchesAssignee
        }),
      })),
    [columns, filters, normalizedSearch],
  )

  const selectedTask =
    tasks.find((task) => task.id === taskDetailsState.taskId && task.status === taskDetailsState.columnId) ??
    tasks.find((task) => task.id === taskDetailsState.taskId) ??
    null

  async function persistTaskUpdate(taskId, updates) {
    if (!hasSupabaseConfig) {
      return
    }

    try {
      setActionError('')
      const savedTask = await updateTask(taskId, updates)
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? savedTask : task)))
    } catch (error) {
      setActionError(formatAppError(error))
      throw error
    }
  }

  async function handleMoveTask(taskId, sourceColumnId, targetColumnId) {
    if (!taskId || !sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) {
      return
    }

    const previousTasks = tasks

    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task
        }

        return {
          ...task,
          status: targetColumnId,
        }
      }),
    )

    try {
      await persistTaskUpdate(taskId, { status: targetColumnId })
    } catch {
      setTasks(previousTasks)
    }
  }

  function handleAddColumn(event) {
    event.preventDefault()

    const normalizedTitle = newColumnTitle.trim()

    if (!normalizedTitle) {
      return
    }

    const columnId = normalizedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '')

    setColumnDefinitions((currentColumns) => [
      ...currentColumns,
      {
        id: `${columnId || 'column'}_${currentColumns.length + 1}`,
        title: normalizedTitle,
        tone: 'default',
      },
    ])
    setNewColumnTitle('')
  }

  function handleOpenTaskModal(columnId) {
    const column = columns.find((item) => item.id === columnId)

    if (!column) {
      return
    }

    setTaskModalState({
      isOpen: true,
      columnId,
      columnTitle: column.title,
      formData: emptyTaskForm(),
    })
  }

  function handleCloseTaskModal() {
    setTaskModalState((currentState) => ({
      ...currentState,
      isOpen: false,
      formData: emptyTaskForm(),
    }))
  }

  function handleTaskFormChange(event) {
    const { name, value } = event.target

    setTaskModalState((currentState) => ({
      ...currentState,
      formData: {
        ...currentState.formData,
        [name]: value,
      },
    }))
  }

  async function handleCreateTask(event) {
    event.preventDefault()

    const { columnId, formData } = taskModalState
    const newTask = {
      id: `temp-${Date.now()}`,
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: columnId,
      assignee: formData.assignee.trim() || 'Unassigned',
      priority: formData.priority,
      dueDate: formData.dueDate || '',
      tag: formData.tag.trim() || 'General',
      completed: false,
      comments: [],
    }

    setActionError('')
    setIsSavingTask(true)

    if (hasSupabaseConfig) {
      try {
        const savedTask = await insertTask(newTask)
        setTasks((currentTasks) => [...currentTasks, savedTask])
        handleCloseTaskModal()
      } catch (error) {
        setActionError(formatAppError(error))
      }
    } else {
      setTasks((currentTasks) => [...currentTasks, newTask])
      handleCloseTaskModal()
    }
    setIsSavingTask(false)
  }

  function handleOpenTaskDetails(columnId, taskId) {
    const column = columns.find((item) => item.id === columnId)
    const task = tasks.find((item) => item.id === taskId)

    if (!column || !task) {
      return
    }

    setTaskDetailsState({
      isOpen: true,
      columnId,
      columnTitle: column.title,
      taskId,
      commentDraft: '',
    })
  }

  function handleCloseTaskDetails() {
    setTaskDetailsState((currentState) => ({
      ...currentState,
      isOpen: false,
      commentDraft: '',
    }))
  }

  function updateLocalTask(taskId, updater) {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task
        }

        return updater(task)
      }),
    )
  }

  async function handleToggleTaskCompleted() {
    if (!selectedTask) {
      return
    }

    const nextCompleted = !selectedTask.completed
    const previousTasks = tasks

    updateLocalTask(selectedTask.id, (task) => ({
      ...task,
      completed: nextCompleted,
    }))

    try {
      await persistTaskUpdate(selectedTask.id, { completed: nextCompleted })
    } catch {
      setTasks(previousTasks)
    }
  }

  function handleCommentDraftChange(event) {
    setTaskDetailsState((currentState) => ({
      ...currentState,
      commentDraft: event.target.value,
    }))
  }

  async function handleAddComment(event) {
    event.preventDefault()

    if (!selectedTask) {
      return
    }

    const trimmedComment = taskDetailsState.commentDraft.trim()

    if (!trimmedComment) {
      return
    }

    const nextComments = [
      ...selectedTask.comments,
      {
        id: `comment-${Date.now()}`,
        author: 'Maya Chen',
        message: trimmedComment,
        createdAt: 'Just now',
      },
    ]

    const previousTasks = tasks
    updateLocalTask(selectedTask.id, (task) => ({
      ...task,
      comments: nextComments,
    }))
    setTaskDetailsState((currentState) => ({
      ...currentState,
      commentDraft: '',
    }))

    if (hasSupabaseConfig) {
      try {
        const savedComment = await insertTaskComment(selectedTask.id, trimmedComment, selectedTask.assignee)
        updateLocalTask(selectedTask.id, (task) => ({
          ...task,
          comments: [...task.comments.slice(0, -1), savedComment],
        }))
      } catch (error) {
        setTasks(previousTasks)
        setActionError(formatAppError(error))
      }
    }
  }

  function handleOpenDeleteConfirm() {
    if (!selectedTask) {
      return
    }

    setDeleteConfirmState({
      isOpen: true,
      taskId: selectedTask.id,
      taskTitle: selectedTask.title,
    })
  }

  function handleCloseDeleteConfirm() {
    setDeleteConfirmState({
      isOpen: false,
      taskId: '',
      taskTitle: '',
    })
  }

  async function handleConfirmDeleteTask() {
    if (!deleteConfirmState.taskId) {
      handleCloseDeleteConfirm()
      return
    }

    const taskId = deleteConfirmState.taskId
    const previousTasks = tasks

    setActionError('')
    handleCloseDeleteConfirm()
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId))
    handleCloseTaskDetails()

    if (!hasSupabaseConfig) {
      return
    }

    try {
      await deleteTask(taskId)
    } catch (error) {
      setTasks(previousTasks)
      setActionError(formatAppError(error))
    }
  }

  function handleFilterChange(field, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }))
  }

  function handleClearFilters() {
    setFilters({
      label: '',
      priority: '',
      assignee: '',
    })
  }

  return (
    <main className="dashboard">
      {!hasSupabaseConfig ? (
        <div className="dashboard__notice dashboard__notice--warning">
          Supabase env variables are missing. The board is running in local demo mode and will not persist after refresh.
        </div>
      ) : null}
      <Header
        title="Product Sprint Board"
        searchPlaceholder="Search task name, owner, or status"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <div className="board">
        {isInitialLoading
          ? defaultColumns.map((column) => (
              <LoadingColumn key={column.id} title={column.title} tone={column.tone} />
            ))
          : (
              <>
                {visibleColumns.map((column) => (
                  <Column
                    key={column.id}
                    id={column.id}
                    title={column.title}
                    tasks={column.tasks}
                    tone={column.tone}
                    onMoveTask={handleMoveTask}
                    onAddTask={handleOpenTaskModal}
                    onOpenTask={handleOpenTaskDetails}
                  />
                ))}

                <section className="column-creator">
                  <p className="column-creator__eyebrow">Customize Board</p>
                  <h2 className="column-creator__title">Add a column</h2>
                  <form className="column-creator__form" onSubmit={handleAddColumn}>
                    <input
                      className="column-creator__input"
                      type="text"
                      name="column-title"
                      placeholder="Enter column name"
                      aria-label="Column name"
                      value={newColumnTitle}
                      onChange={(event) => setNewColumnTitle(event.target.value)}
                    />
                    <button className="column-creator__button" type="submit">
                      Add Column
                    </button>
                  </form>
                </section>
              </>
            )}
      </div>

      <TaskModal
        isOpen={taskModalState.isOpen}
        formData={taskModalState.formData}
        onChange={handleTaskFormChange}
        onClose={handleCloseTaskModal}
        onSubmit={handleCreateTask}
        columnTitle={taskModalState.columnTitle}
        isSaving={isSavingTask}
      />

      <TaskDetails
        isOpen={taskDetailsState.isOpen}
        task={selectedTask}
        columnTitle={taskDetailsState.columnTitle}
        commentDraft={taskDetailsState.commentDraft}
        onCommentChange={handleCommentDraftChange}
        onCommentSubmit={handleAddComment}
        onClose={handleCloseTaskDetails}
        onToggleCompleted={handleToggleTaskCompleted}
        onDeleteTask={handleOpenDeleteConfirm}
      />

      <ConfirmDialog
        isOpen={deleteConfirmState.isOpen}
        title="Delete this task?"
        message={`This will permanently remove "${deleteConfirmState.taskTitle}" from the board.`}
        confirmLabel="Delete Task"
        onConfirm={handleConfirmDeleteTask}
        onCancel={handleCloseDeleteConfirm}
      />

      {(isLoading || loadError || actionError) && (
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          <Toast tone="info" title="Loading" message={isLoading ? 'Loading your task board from Supabase...' : ''} />
          <Toast tone="error" title="Error" message={loadError} onDismiss={() => setLoadError('')} />
          <Toast tone="error" title="Error" message={actionError} onDismiss={() => setActionError('')} />
        </div>
      )}
    </main>
  )
}

