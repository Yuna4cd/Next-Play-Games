import Tasks from './Tasks'
import { useEffect, useRef, useState } from 'react'

const TASK_EXIT_ANIMATION_MS = 220
const TASK_ENTER_ANIMATION_MS = 220

export default function Column({
  id,
  title,
  tasks = [],
  tone = 'default',
  onMoveTask,
  onAddTask,
  onOpenTask,
  onOpenColumn,
  onMoveColumn,
}) {
  const [isDropActive, setIsDropActive] = useState(false)
  const [isDropSettling, setIsDropSettling] = useState(false)
  const [isColumnDropActive, setIsColumnDropActive] = useState(false)
  const [renderedTasks, setRenderedTasks] = useState(() =>
    tasks.map((task) => ({
      ...task,
      animationState: 'idle',
    })),
  )
  const settleTimerRef = useRef(null)
  const taskExitTimersRef = useRef(new Map())
  const taskEnterTimersRef = useRef(new Map())

  useEffect(() => {
    setRenderedTasks((currentRenderedTasks) => {
      const currentTaskMap = new Map(currentRenderedTasks.map((task) => [task.id, task]))
      const nextTaskIds = new Set(tasks.map((task) => task.id))
      const nextRenderedTasks = []

      tasks.forEach((task) => {
        const existingTask = currentTaskMap.get(task.id)

        if (existingTask) {
          const nextAnimationState = existingTask.animationState === 'exit' ? 'enter' : existingTask.animationState
          nextRenderedTasks.push({
            ...existingTask,
            ...task,
            animationState: nextAnimationState === 'enter' ? 'enter' : 'idle',
          })
          return
        }

        nextRenderedTasks.push({
          ...task,
          animationState: 'enter',
        })
      })

      currentRenderedTasks.forEach((task) => {
        if (!nextTaskIds.has(task.id)) {
          nextRenderedTasks.push({
            ...task,
            animationState: 'exit',
          })
        }
      })

      return nextRenderedTasks
    })
  }, [tasks])

  useEffect(() => {
    renderedTasks.forEach((task) => {
      if (task.animationState === 'exit' && !taskExitTimersRef.current.has(task.id)) {
        const timerId = setTimeout(() => {
          setRenderedTasks((currentRenderedTasks) => currentRenderedTasks.filter((currentTask) => currentTask.id !== task.id))
          taskExitTimersRef.current.delete(task.id)
        }, TASK_EXIT_ANIMATION_MS)

        taskExitTimersRef.current.set(task.id, timerId)
      }

      if (task.animationState !== 'exit' && taskExitTimersRef.current.has(task.id)) {
        clearTimeout(taskExitTimersRef.current.get(task.id))
        taskExitTimersRef.current.delete(task.id)
      }

      if (task.animationState === 'enter' && !taskEnterTimersRef.current.has(task.id)) {
        const timerId = setTimeout(() => {
          setRenderedTasks((currentRenderedTasks) =>
            currentRenderedTasks.map((currentTask) =>
              currentTask.id === task.id && currentTask.animationState === 'enter'
                ? { ...currentTask, animationState: 'idle' }
                : currentTask,
            ),
          )
          taskEnterTimersRef.current.delete(task.id)
        }, TASK_ENTER_ANIMATION_MS)

        taskEnterTimersRef.current.set(task.id, timerId)
      }

      if (task.animationState !== 'enter' && taskEnterTimersRef.current.has(task.id)) {
        clearTimeout(taskEnterTimersRef.current.get(task.id))
        taskEnterTimersRef.current.delete(task.id)
      }
    })
  }, [renderedTasks])

  useEffect(
    () => () => {
      taskExitTimersRef.current.forEach((timerId) => clearTimeout(timerId))
      taskExitTimersRef.current.clear()
      taskEnterTimersRef.current.forEach((timerId) => clearTimeout(timerId))
      taskEnterTimersRef.current.clear()
    },
    [],
  )

  function startDropSettleAnimation() {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current)
    }

    setIsDropSettling(true)
    settleTimerRef.current = setTimeout(() => {
      setIsDropSettling(false)
      settleTimerRef.current = null
    }, 320)
  }

  function handleDragOver(event) {
    event.preventDefault()
    const draggedColumnId = event.dataTransfer.getData('text/column-id')

    event.dataTransfer.dropEffect = 'move'

    if (draggedColumnId) {
      setIsColumnDropActive(true)
      return
    }

    setIsDropActive(true)
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDropActive(false)
      setIsColumnDropActive(false)
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDropActive(false)
    setIsColumnDropActive(false)

    const sourceDraggedColumnId = event.dataTransfer.getData('text/column-id')

    if (sourceDraggedColumnId) {
      onMoveColumn?.(sourceDraggedColumnId, id)
      startDropSettleAnimation()
      return
    }

    const taskId = event.dataTransfer.getData('text/task-id')
    const sourceColumnId = event.dataTransfer.getData('text/source-column-id')

    onMoveTask?.(taskId, sourceColumnId, id)
    startDropSettleAnimation()
  }

  function handleDropEnd() {
    setIsDropActive(false)
    setIsColumnDropActive(false)
  }

  function handleColumnDragStart(event) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/column-id', id)
  }

  function handleColumnTitleClick() {
    onOpenColumn?.(id)
  }

  return (
    <section
      className={`column-container${isDropActive ? ' column-container--active' : ''}${
        isColumnDropActive ? ' column-container--column-active' : ''
      }${isDropSettling ? ' column-container--settled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDropEnd}
    >
      <button
        className="column-title column-title--button"
        type="button"
        onClick={handleColumnTitleClick}
        draggable
        onDragStart={handleColumnDragStart}
        aria-label={`Open details for ${title} and drag to reorder`}
      >
        <div className="column-title__copy">
          <p className={`column-title__dot column-title__dot--${tone}`} />
          <h2>{title}</h2>
        </div>
        <span className="column-title__count">{tasks.length}</span>
      </button>

      <div className="column-tasks">
        {renderedTasks.length ? (
          renderedTasks.map((task) => (
            <Tasks
              key={task.id}
              task={task}
              columnId={id}
              onOpenTask={onOpenTask}
              animationState={task.animationState}
            />
          ))
        ) : (
          <p className="column-empty-state">No tasks in this column.</p>
        )}
      </div>

      <button
        className="column-add-task"
        type="button"
        onClick={() => onAddTask?.(id)}
        aria-label={`Add a new task to ${title}`}
      >
        <span className="column-add-task__icon" aria-hidden="true">
          +
        </span>
        <span className="column-add-task__label">Add task</span>
      </button>
    </section>
  )
}
