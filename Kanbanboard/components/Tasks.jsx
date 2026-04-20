
import { useState } from 'react'

function formatDueDate(dueDate) {
  if (!dueDate) {
    return ''
  }

  const parsedDate = new Date(dueDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return dueDate
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parsedDate)
}

export default function Tasks({
  columnId,
  onOpenTask,
  animationState = 'idle',
  task: {
    id,
    title,
    assignee,
    priority = 'Medium',
    dueDate,
    tags = [],
    completed,
  },
}) {
  const [isDragging, setIsDragging] = useState(false)
  const priorityClassName = `task-card__priority task-card__priority--${priority.toLowerCase()}`

  function handleDragStart(event) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/task-id', id)
    event.dataTransfer.setData('text/source-column-id', columnId)
    setIsDragging(true)
  }

  function handleDragEnd() {
    setIsDragging(false)
  }

  function handleClick() {
    if (!isDragging) {
      onOpenTask?.(columnId, id)
    }
  }

  return (
    <article
      className={`task-card${isDragging ? ' task-card--dragging' : ''}${completed ? ' task-card--completed' : ''}${
        animationState === 'enter' ? ' task-card--enter' : ''
      }${animationState === 'exit' ? ' task-card--exit' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    >
      <div className="task-card__row task-card__row--top">
        <div className="task-card__tags">
          {tags.length ? tags.map((tag) => <span key={tag} className="task-card__tag">{tag}</span>) : <span />}
        </div>
        <span className={priorityClassName}>{priority}</span>
      </div>

      <div className="task-card__row task-card__row--middle">
        <h3 className="task-card__title">{title}</h3>
      </div>

      <div className="task-card__row task-card__row--bottom">
        <span>{assignee}</span>
        <p className={`task-card__date${dueDate ? '' : ' task-card__date--empty'}`}>
          {dueDate ? `Due ${formatDueDate(dueDate)}` : 'Due TBD'}
        </p>
      </div>
    </article>
  )
}
