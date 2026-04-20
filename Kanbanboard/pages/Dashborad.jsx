import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import Column from '../components/Column'
import ColumnDetail from '../components/ColumnDetail'
import TaskDetails from '../components/TaskDetails'
import TaskModal from '../components/TaskModal'
import {
  fetchTasks,
  insertTask,
  updateTask,
  deleteTask,
  ensureAnonymousSession,
  insertTaskComment,
  insertTaskActivity,
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
    tags: [''],
  }
}

function normalizeTags(tags) {
  const cleaned = tags.map((tag) => tag.trim()).filter(Boolean)
  return cleaned.length ? cleaned : ['General']
}

function createActivityEntry(actionType, actor = 'Maya Chen', metadata = {}) {
  return {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actor,
    actionType,
    metadata,
    createdAt: new Date().toISOString(),
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
    isEditing: false,
    titleDraft: '',
    tagsDraft: ['General'],
    priorityDraft: 'Medium',
    assigneeDraft: '',
    commentDraft: '',
  })
  const [columnDetailsState, setColumnDetailsState] = useState({
    isOpen: false,
    columnId: '',
    isEditing: false,
    titleDraft: '',
    toneDraft: 'default',
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
      labels: [...new Set(tasks.flatMap((task) => task.tags || []).filter(Boolean))].sort(),
      priorities: [...new Set(tasks.map((task) => task.priority).filter(Boolean))],
      assignees: [...new Set(tasks.map((task) => task.assignee).filter(Boolean))].sort(),
    }),
    [tasks],
  )

  const headerStats = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length

    return {
      total: tasks.length,
      completed,
      notCompleted: tasks.length - completed,
    }
  }, [tasks])

  const normalizedSearch = searchValue.trim().toLowerCase()
  const visibleColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => {
          const matchesSearch = !normalizedSearch || task.title.toLowerCase().includes(normalizedSearch)

          const matchesTag = !filters.label || (task.tags || []).includes(filters.label)
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

  const selectedColumn = columns.find((column) => column.id === columnDetailsState.columnId) ?? null

  useEffect(() => {
    if (!selectedTask || !taskDetailsState.isOpen) {
      return
    }

    setTaskDetailsState((currentState) => {
      if (
        currentState.isEditing ||
        (currentState.titleDraft === selectedTask.title &&
          JSON.stringify(currentState.tagsDraft) === JSON.stringify(selectedTask.tags || ['General']) &&
          currentState.priorityDraft === selectedTask.priority &&
          currentState.assigneeDraft === selectedTask.assignee)
      ) {
        return currentState
      }

      return {
        ...currentState,
        isEditing: false,
        titleDraft: selectedTask.title,
        tagsDraft: selectedTask.tags || ['General'],
        priorityDraft: selectedTask.priority,
        assigneeDraft: selectedTask.assignee,
      }
    })
  }, [selectedTask, taskDetailsState.isOpen])

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

  async function saveTaskActivity(taskId, entry) {
    if (!hasSupabaseConfig) {
      return
    }

    const savedEntry = await insertTaskActivity(taskId, entry.actionType, entry.metadata, entry.actor)
    updateLocalTask(taskId, (task) => ({
      ...task,
      history: [savedEntry, ...(task.history || []).filter((historyEntry) => historyEntry.id !== entry.id)],
    }))
  }

  async function handleMoveTask(taskId, sourceColumnId, targetColumnId) {
    if (!taskId || !sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) {
      return
    }

    const previousTasks = tasks
    const sourceColumnTitle = columns.find((column) => column.id === sourceColumnId)?.title || prettifyStatus(sourceColumnId)
    const targetColumnTitle = columns.find((column) => column.id === targetColumnId)?.title || prettifyStatus(targetColumnId)
    const activityEntry = createActivityEntry('status_changed', 'Maya Chen', {
      from: sourceColumnTitle,
      to: targetColumnTitle,
    })

    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task
        }

        return {
          ...task,
          status: targetColumnId,
          history: [activityEntry, ...(task.history || [])],
        }
      }),
    )

    try {
      await persistTaskUpdate(taskId, { status: targetColumnId })
      await saveTaskActivity(taskId, activityEntry)
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

  function handleMoveColumn(sourceColumnId, targetColumnId) {
    if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) {
      return
    }

    setColumnDefinitions((currentColumns) => {
      const sourceIndex = currentColumns.findIndex((column) => column.id === sourceColumnId)
      const targetIndex = currentColumns.findIndex((column) => column.id === targetColumnId)

      if (sourceIndex === -1 || targetIndex === -1) {
        return currentColumns
      }

      const nextColumns = [...currentColumns]
      const [movedColumn] = nextColumns.splice(sourceIndex, 1)
      nextColumns.splice(targetIndex, 0, movedColumn)
      return nextColumns
    })
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

  function handleOpenColumnDetails(columnId) {
    const column = columns.find((item) => item.id === columnId)

    if (!column) {
      return
    }

    setColumnDetailsState({
      isOpen: true,
      columnId,
      isEditing: false,
      titleDraft: column.title,
      toneDraft: column.tone || 'default',
    })
  }

  function handleCloseColumnDetails() {
    setColumnDetailsState({
      isOpen: false,
      columnId: '',
      isEditing: false,
      titleDraft: '',
      toneDraft: 'default',
    })
  }

  function handleOpenColumnEdit() {
    if (!selectedColumn) {
      return
    }

    setColumnDetailsState((currentState) => ({
      ...currentState,
      isEditing: true,
      titleDraft: selectedColumn.title,
      toneDraft: selectedColumn.tone || 'default',
    }))
  }

  function handleCancelColumnEdit() {
    if (!selectedColumn) {
      return
    }

    setColumnDetailsState((currentState) => ({
      ...currentState,
      isEditing: false,
      titleDraft: selectedColumn.title,
      toneDraft: selectedColumn.tone || 'default',
    }))
  }

  function handleColumnDetailsFieldChange(event) {
    const { name, value } = event.target

    setColumnDetailsState((currentState) => ({
      ...currentState,
      [name]: value,
    }))
  }

  function handleSaveColumnDetails(event) {
    event.preventDefault()

    if (!selectedColumn) {
      return
    }

    const nextTitle = columnDetailsState.titleDraft.trim()

    if (!nextTitle) {
      setColumnDetailsState((currentState) => ({
        ...currentState,
        titleDraft: selectedColumn.title,
      }))
      return
    }

    setColumnDefinitions((currentColumns) =>
      currentColumns.map((column) =>
        column.id === selectedColumn.id
          ? {
              ...column,
              title: nextTitle,
              tone: columnDetailsState.toneDraft,
            }
          : column,
      ),
    )

    setColumnDetailsState((currentState) => ({
      ...currentState,
      isEditing: false,
    }))
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
    const createdEntry = createActivityEntry('task_created', 'Maya Chen', {
      title: formData.title.trim(),
    })
    const newTask = {
      id: `temp-${Date.now()}`,
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: columnId,
      assignee: formData.assignee.trim() || 'Unassigned',
      priority: formData.priority,
      dueDate: formData.dueDate || '',
      tags: normalizeTags(formData.tags),
      completed: false,
      comments: [],
      history: [createdEntry],
    }

    setActionError('')
    setIsSavingTask(true)

    if (hasSupabaseConfig) {
      try {
        const savedTask = await insertTask(newTask)
        setTasks((currentTasks) => [...currentTasks, { ...savedTask, history: [createdEntry] }])
        await saveTaskActivity(savedTask.id, createdEntry)
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
      isEditing: false,
      titleDraft: task.title,
      tagsDraft: task.tags || ['General'],
      priorityDraft: task.priority,
      assigneeDraft: task.assignee,
      commentDraft: '',
    })
  }

  function handleCloseTaskDetails() {
    setTaskDetailsState((currentState) => ({
      ...currentState,
      isOpen: false,
      isEditing: false,
      titleDraft: '',
      tagsDraft: ['General'],
      priorityDraft: 'Medium',
      assigneeDraft: '',
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
    const activityEntry = createActivityEntry('completion_changed', 'Maya Chen', {
      completed: nextCompleted,
    })

    updateLocalTask(selectedTask.id, (task) => ({
      ...task,
      completed: nextCompleted,
      history: [activityEntry, ...(task.history || [])],
    }))

    try {
      await persistTaskUpdate(selectedTask.id, { completed: nextCompleted })
      await saveTaskActivity(selectedTask.id, activityEntry)
    } catch {
      setTasks(previousTasks)
    }
  }

  function handleOpenTaskEdit() {
    if (!selectedTask) {
      return
    }

    setTaskDetailsState((currentState) => ({
      ...currentState,
      isEditing: true,
      titleDraft: selectedTask.title,
      tagsDraft: selectedTask.tags || ['General'],
      priorityDraft: selectedTask.priority,
      assigneeDraft: selectedTask.assignee,
    }))
  }

  function handleCancelTaskEdit() {
    if (!selectedTask) {
      return
    }

    setTaskDetailsState((currentState) => ({
      ...currentState,
      isEditing: false,
      titleDraft: selectedTask.title,
      tagsDraft: selectedTask.tags || ['General'],
      priorityDraft: selectedTask.priority,
      assigneeDraft: selectedTask.assignee,
    }))
  }

  function handleTaskDetailsFieldChange(event) {
    const { name, value } = event.target

    setTaskDetailsState((currentState) => ({
      ...currentState,
      [name]: value,
    }))
  }

  function handleTaskFormTagChange(index, value) {
    setTaskModalState((currentState) => ({
      ...currentState,
      formData: {
        ...currentState.formData,
        tags: currentState.formData.tags.map((tag, currentIndex) => (currentIndex === index ? value : tag)),
      },
    }))
  }

  function handleAddTaskFormTag() {
    setTaskModalState((currentState) => ({
      ...currentState,
      formData: {
        ...currentState.formData,
        tags: [...currentState.formData.tags, ''],
      },
    }))
  }

  function handleRemoveTaskFormTag(index) {
    setTaskModalState((currentState) => ({
      ...currentState,
      formData: {
        ...currentState.formData,
        tags: currentState.formData.tags.filter((_, currentIndex) => currentIndex !== index),
      },
    }))
  }

  function handleTagDraftChange(index, value) {
    setTaskDetailsState((currentState) => ({
      ...currentState,
      tagsDraft: currentState.tagsDraft.map((tag, currentIndex) => (currentIndex === index ? value : tag)),
    }))
  }

  function handleAddTagDraft() {
    setTaskDetailsState((currentState) => ({
      ...currentState,
      tagsDraft: [...currentState.tagsDraft, ''],
    }))
  }

  function handleRemoveTagDraft(index) {
    setTaskDetailsState((currentState) => ({
      ...currentState,
      tagsDraft: currentState.tagsDraft.filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  async function handleSaveTaskDetails(event) {
    event.preventDefault()

    if (!selectedTask) {
      return
    }

    const nextTitle = taskDetailsState.titleDraft.trim()
    const nextTags = normalizeTags(taskDetailsState.tagsDraft)
    const nextPriority = taskDetailsState.priorityDraft
    const nextAssignee = taskDetailsState.assigneeDraft.trim() || 'Unassigned'

    if (!nextTitle) {
      setTaskDetailsState((currentState) => ({
        ...currentState,
        titleDraft: selectedTask.title,
      }))
      return
    }

    const updates = {}
    const activityEntries = []

    if (nextTitle !== selectedTask.title) {
      updates.title = nextTitle
      activityEntries.push(
        createActivityEntry('title_changed', 'Maya Chen', {
          from: selectedTask.title,
          to: nextTitle,
        }),
      )
    }

    if (JSON.stringify(nextTags) !== JSON.stringify(selectedTask.tags || ['General'])) {
      updates.tags = nextTags
      activityEntries.push(
        createActivityEntry('tags_changed', 'Maya Chen', {
          from: selectedTask.tags || ['General'],
          to: nextTags,
        }),
      )
    }

    if (nextPriority !== selectedTask.priority) {
      updates.priority = nextPriority
      activityEntries.push(
        createActivityEntry('priority_changed', 'Maya Chen', {
          from: selectedTask.priority,
          to: nextPriority,
        }),
      )
    }

    if (nextAssignee !== selectedTask.assignee) {
      updates.assignee = nextAssignee
      activityEntries.push(
        createActivityEntry('assignee_changed', 'Maya Chen', {
          from: selectedTask.assignee,
          to: nextAssignee,
        }),
      )
    }

    if (!activityEntries.length) {
      setTaskDetailsState((currentState) => ({
        ...currentState,
        isEditing: false,
      }))
      return
    }

    const previousTasks = tasks
    const nextHistoryEntries = [...activityEntries].reverse()

    updateLocalTask(selectedTask.id, (task) => ({
      ...task,
      ...updates,
      history: [...nextHistoryEntries, ...(task.history || [])],
    }))

    try {
      await persistTaskUpdate(selectedTask.id, updates)
      for (const activityEntry of activityEntries) {
        await saveTaskActivity(selectedTask.id, activityEntry)
      }
      setTaskDetailsState((currentState) => ({
        ...currentState,
        isEditing: false,
      }))
    } catch {
      setTasks(previousTasks)
      setTaskDetailsState((currentState) => ({
        ...currentState,
        isEditing: false,
        titleDraft: selectedTask.title,
        tagsDraft: selectedTask.tags || ['General'],
        priorityDraft: selectedTask.priority,
        assigneeDraft: selectedTask.assignee,
      }))
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

  function renderHistoryEntry(entry) {
    if (entry.actionType === 'status_changed') {
      return `Moved From ${entry.metadata.from || 'Unknown'} to ${entry.metadata.to || 'Unknown'}`
    }

    if (entry.actionType === 'title_changed') {
      return `Changed Task Name from [${entry.metadata.from || ''}] to [${entry.metadata.to || ''}]`
    }

    if (entry.actionType === 'tags_changed') {
      const fromTags = Array.isArray(entry.metadata.from) ? entry.metadata.from.join(', ') : entry.metadata.from || ''
      const toTags = Array.isArray(entry.metadata.to) ? entry.metadata.to.join(', ') : entry.metadata.to || ''
      return `Changed Tags from [${fromTags}] to [${toTags}]`
    }

    if (entry.actionType === 'priority_changed') {
      return `Changed Priority from [${entry.metadata.from || ''}] to [${entry.metadata.to || ''}]`
    }

    if (entry.actionType === 'assignee_changed') {
      return `Changed Assignee from [${entry.metadata.from || ''}] to [${entry.metadata.to || ''}]`
    }

    if (entry.actionType === 'completion_changed') {
      return entry.metadata.completed ? 'Marked task as completed' : 'Marked task as incomplete'
    }

    if (entry.actionType === 'task_created') {
      return `Created task [${entry.metadata.title || ''}]`
    }

    return 'Updated task'
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
        searchPlaceholder="Search task title"
        searchValue={searchValue}
        stats={headerStats}
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
                    onMoveColumn={handleMoveColumn}
                    onAddTask={handleOpenTaskModal}
                    onOpenTask={handleOpenTaskDetails}
                    onOpenColumn={handleOpenColumnDetails}
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
        onTagChange={handleTaskFormTagChange}
        onAddTag={handleAddTaskFormTag}
        onRemoveTag={handleRemoveTaskFormTag}
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
        isEditing={taskDetailsState.isEditing}
        titleDraft={taskDetailsState.titleDraft}
        tagsDraft={taskDetailsState.tagsDraft}
        priorityDraft={taskDetailsState.priorityDraft}
        assigneeDraft={taskDetailsState.assigneeDraft}
        onCommentChange={handleCommentDraftChange}
        onCommentSubmit={handleAddComment}
        onDetailsFieldChange={handleTaskDetailsFieldChange}
        onTagDraftChange={handleTagDraftChange}
        onAddTagDraft={handleAddTagDraft}
        onRemoveTagDraft={handleRemoveTagDraft}
        onEditStart={handleOpenTaskEdit}
        onEditCancel={handleCancelTaskEdit}
        onDetailsSubmit={handleSaveTaskDetails}
        onClose={handleCloseTaskDetails}
        onToggleCompleted={handleToggleTaskCompleted}
        onDeleteTask={handleOpenDeleteConfirm}
        renderHistoryEntry={renderHistoryEntry}
      />

      <ColumnDetail
        isOpen={columnDetailsState.isOpen}
        column={selectedColumn}
        isEditing={columnDetailsState.isEditing}
        titleDraft={columnDetailsState.titleDraft}
        toneDraft={columnDetailsState.toneDraft}
        onFieldChange={handleColumnDetailsFieldChange}
        onEditStart={handleOpenColumnEdit}
        onEditCancel={handleCancelColumnEdit}
        onSubmit={handleSaveColumnDetails}
        onClose={handleCloseColumnDetails}
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

