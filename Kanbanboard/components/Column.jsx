import Tasks from './Tasks'
import { useRef, useState } from 'react'

export default function Column({
  id,
  title,
  tasks = [],
  tone = 'default',
  onMoveTask,
  onAddTask,
  onOpenTask,
}) {
  const [isDropActive, setIsDropActive] = useState(false)
  const [isDropSettling, setIsDropSettling] = useState(false)
  const settleTimerRef = useRef(null)

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
    event.dataTransfer.dropEffect = 'move'
    setIsDropActive(true)
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDropActive(false)
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDropActive(false)

    const taskId = event.dataTransfer.getData('text/task-id')
    const sourceColumnId = event.dataTransfer.getData('text/source-column-id')

    onMoveTask?.(taskId, sourceColumnId, id)
    startDropSettleAnimation()
  }

  function handleDropEnd() {
    setIsDropActive(false)
  }

  return (
    <section
      className={`column-container${isDropActive ? ' column-container--active' : ''}${isDropSettling ? ' column-container--settled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDropEnd}
    >
      <div className="column-title">
        <div className="column-title__copy">
          <p className={`column-title__dot column-title__dot--${tone}`} />
          <h2>{title}</h2>
        </div>
        <span className="column-title__count">{tasks.length}</span>
      </div>

      <div className="column-tasks">
        {tasks.length ? (
          tasks.map((task) => (
            <Tasks key={task.id} task={task} columnId={id} onOpenTask={onOpenTask} />
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
