import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import Column from '../components/Column'
import TaskDetails from '../components/TaskDetails'
import TaskModal from '../components/TaskModal'
import {
  fetchTasks,
  insertTask,
  updateTask,
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

const initialSampleTasks = [
  {
    id: 'task-1',
    title: 'Write onboarding flow copy',
    status: 'todo',
    assignee: 'Maya',
    priority: 'High',
    dueDate: '2026-04-22',
    tag: 'Content',
    completed: false,
    comments: [],
  },
  {
    id: 'task-2',
    title: 'Review API error states',
    status: 'todo',
    assignee: 'Leo',
    priority: 'Medium',
    dueDate: '2026-04-24',
    tag: 'QA',
    completed: false,
    comments: [],
  },
  {
    id: 'task-3',
    title: 'Build drag and drop interactions',
    status: 'in_progress',
    assignee: 'Jordan',
    priority: 'High',
    dueDate: '2026-04-20',
    tag: 'Frontend',
    completed: false,
    comments: [],
  },
  {
    id: 'task-4',
    title: 'Connect board filters to state',
    status: 'in_progress',
    assignee: 'Ava',
    priority: 'Medium',
    dueDate: '2026-04-21',
    tag: 'React',
    completed: false,
    comments: [],
  },
  {
    id: 'task-5',
    title: 'Validate responsive spacing on mobile',
    status: 'in_review',
    assignee: 'Nina',
    priority: 'Low',
    dueDate: '2026-04-23',
    tag: 'Design',
    completed: false,
    comments: [],
  },
  {
    id: 'task-6',
    title: 'Create reusable header component',
    status: 'done',
    assignee: 'Chris',
    priority: 'Done',
    dueDate: '2026-04-18',
    tag: 'UI',
    completed: true,
    comments: [],
  },
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

export default function Dashboard() {
  const [tasks, setTasks] = useState(initialSampleTasks)
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

      {isLoading ? (
        <div className="dashboard__notice dashboard__notice--info">Loading your task board from Supabase…</div>
      ) : null}

      {loadError ? <div className="dashboard__notice dashboard__notice--error">{loadError}</div> : null}
      {actionError ? <div className="dashboard__notice dashboard__notice--error">{actionError}</div> : null}

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
      />
    </main>
  )
}
