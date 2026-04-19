import { useState } from 'react'
import Header from '../components/Header'
import Column from '../components/Column'
import TaskDetails from '../components/TaskDetails'
import TaskModal from '../components/TaskModal'

const priorityOrder = {
  High: 0,
  Medium: 1,
  Low: 2,
  Done: 3,
}

function createTask(task) {
  return {
    ...task,
    completed: task.completed ?? false,
    comments: task.comments ?? [],
  }
}

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

const initialColumns = [
  {
    id: 'todo',
    title: 'To-Do',
    tone: 'amber',
    tasks: [
      createTask({
        id: 'task-1',
        title: 'Write onboarding flow copy',
        assignee: 'Maya',
        priority: 'High',
        dueDate: 'Apr 22',
        tag: 'Content',
      }),
      createTask({
        id: 'task-2',
        title: 'Review API error states',
        assignee: 'Leo',
        priority: 'Medium',
        dueDate: 'Apr 24',
        tag: 'QA',
      }),
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    tone: 'blue',
    tasks: [
      createTask({
        id: 'task-3',
        title: 'Build drag and drop interactions',
        assignee: 'Jordan',
        priority: 'High',
        dueDate: 'Apr 20',
        tag: 'Frontend',
      }),
      createTask({
        id: 'task-4',
        title: 'Connect board filters to state',
        assignee: 'Ava',
        priority: 'Medium',
        dueDate: 'Apr 21',
        tag: 'React',
      }),
    ],
  },
  {
    id: 'in-review',
    title: 'In Review',
    tone: 'violet',
    tasks: [
      createTask({
        id: 'task-5',
        title: 'Validate responsive spacing on mobile',
        assignee: 'Nina',
        priority: 'Low',
        dueDate: 'Apr 23',
        tag: 'Design',
      }),
    ],
  },
  {
    id: 'done',
    title: 'Done',
    tone: 'green',
    tasks: [
      createTask({
        id: 'task-6',
        title: 'Create reusable header component',
        assignee: 'Chris',
        priority: 'Done',
        dueDate: 'Apr 18',
        tag: 'UI',
        completed: true,
      }),
    ],
  },
]

export default function Dashboard() {
  const [columns, setColumns] = useState(initialColumns)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [taskCounter, setTaskCounter] = useState(
    initialColumns.reduce((count, column) => count + column.tasks.length, 0) + 1,
  )
  const [taskModalState, setTaskModalState] = useState({
    isOpen: false,
    columnId: '',
    columnTitle: '',
    formData: {
      title: '',
      assignee: '',
      priority: 'Medium',
      dueDate: '',
      tag: '',
    },
  })
  const [taskDetailsState, setTaskDetailsState] = useState({
    isOpen: false,
    columnId: '',
    columnTitle: '',
    taskId: '',
    commentDraft: '',
  })

  function handleMoveTask(taskId, sourceColumnId, targetColumnId) {
    if (!taskId || !sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) {
      return
    }

    setColumns((currentColumns) => {
      const sourceColumn = currentColumns.find((column) => column.id === sourceColumnId)
      const taskToMove = sourceColumn?.tasks.find((task) => task.id === taskId)

      if (!sourceColumn || !taskToMove) {
        return currentColumns
      }

      return currentColumns.map((column) => {
        if (column.id === sourceColumnId) {
          return {
            ...column,
            tasks: sortTasksByPriority(column.tasks.filter((task) => task.id !== taskId)),
          }
        }

        if (column.id === targetColumnId) {
          return {
            ...column,
            tasks: sortTasksByPriority([...column.tasks, taskToMove]),
          }
        }

        return column
      })
    })
  }

  function handleAddColumn(event) {
    event.preventDefault()

    const normalizedTitle = newColumnTitle.trim()

    if (!normalizedTitle) {
      return
    }

    const columnId = normalizedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    setColumns((currentColumns) => [
      ...currentColumns,
      {
        id: `${columnId || 'column'}-${currentColumns.length + 1}`,
        title: normalizedTitle,
        tone: 'default',
        tasks: [],
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
      formData: {
        title: '',
        assignee: '',
        priority: 'Medium',
        dueDate: '',
        tag: '',
      },
    })
  }

  function handleCloseTaskModal() {
    setTaskModalState((currentState) => ({
      ...currentState,
      isOpen: false,
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

  function handleCreateTask(event) {
    event.preventDefault()

    const nextTaskId = `task-${taskCounter}`
    const { columnId, formData } = taskModalState

    setColumns((currentColumns) =>
      currentColumns.map((column) => {
        if (column.id !== columnId) {
          return column
        }

        return {
          ...column,
          tasks: sortTasksByPriority([
            ...sortTasksByPriority(column.tasks),
            createTask({
              id: nextTaskId,
              title: formData.title.trim(),
              assignee: formData.assignee.trim() || 'Unassigned',
              priority: formData.priority,
              dueDate: formData.dueDate.trim() || 'TBD',
              tag: formData.tag.trim() || 'New',
            }),
          ]),
        }
      }),
    )
    setTaskCounter((currentCount) => currentCount + 1)
    handleCloseTaskModal()
  }

  function handleOpenTaskDetails(columnId, taskId) {
    const column = columns.find((item) => item.id === columnId)
    const task = column?.tasks.find((item) => item.id === taskId)

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

  function updateTaskInColumns(columnId, taskId, updater) {
    setColumns((currentColumns) =>
      currentColumns.map((column) => {
        if (column.id !== columnId) {
          return column
        }

        return {
          ...column,
          tasks: sortTasksByPriority(
            column.tasks.map((task) => {
              if (task.id !== taskId) {
                return task
              }

              return updater(task)
            }),
          ),
        }
      }),
    )
  }

  function handleToggleTaskCompleted() {
    const { columnId, taskId } = taskDetailsState

    updateTaskInColumns(columnId, taskId, (task) => ({
      ...task,
      completed: !task.completed,
    }))
  }

  function handleCommentDraftChange(event) {
    setTaskDetailsState((currentState) => ({
      ...currentState,
      commentDraft: event.target.value,
    }))
  }

  function handleAddComment(event) {
    event.preventDefault()

    const trimmedComment = taskDetailsState.commentDraft.trim()

    if (!trimmedComment) {
      return
    }

    const { columnId, taskId } = taskDetailsState

    updateTaskInColumns(columnId, taskId, (task) => ({
      ...task,
      comments: [
        ...task.comments,
        {
          id: `comment-${Date.now()}`,
          author: 'Maya Chen',
          message: trimmedComment,
          createdAt: 'Just now',
        },
      ],
    }))

    setTaskDetailsState((currentState) => ({
      ...currentState,
      commentDraft: '',
    }))
  }

  const selectedTask =
    columns
      .find((column) => column.id === taskDetailsState.columnId)
      ?.tasks.find((task) => task.id === taskDetailsState.taskId) ?? null

  return (
    <main className="dashboard">
      <Header
        title="Product Sprint Board"
        searchPlaceholder="Search task name, owner, or status"
      />

      <div className="board">
        {columns.map((column) => (
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
