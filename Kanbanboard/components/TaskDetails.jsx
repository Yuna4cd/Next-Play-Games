function formatDueDate(dueDate) {
  if (!dueDate) {
    return 'TBD'
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

function formatCommentTimestamp(createdAt) {
  const parsedDate = new Date(createdAt)

  if (Number.isNaN(parsedDate.getTime())) {
    return createdAt
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsedDate)
}

export default function TaskDetails({
  isOpen,
  task,
  columnTitle,
  commentDraft,
  onCommentChange,
  onCommentSubmit,
  onClose,
  onToggleCompleted,
}) {
  if (!isOpen || !task) {
    return null
  }

  return (
    <div className="task-details" role="dialog" aria-modal="true" aria-labelledby="task-details-title">
      <div className="task-details__backdrop" onClick={onClose} />

      <div className="task-details__panel">
        <div className="task-details__header">
          <div>
            <p className="task-details__eyebrow">{columnTitle}</p>
            <h2 className="task-details__title" id="task-details-title">
              {task.title}
            </h2>
          </div>

          <button className="task-details__close" type="button" onClick={onClose} aria-label="Close task details">
            x
          </button>
        </div>

        <div className="task-details__meta">
          <span className="task-details__chip">{task.tag || 'General'}</span>
          <span className={`task-card__priority task-card__priority--${task.priority.toLowerCase()}`}>
            {task.priority}
          </span>
        </div>

        <div className="task-details__grid">
          <div className="task-details__info">
            <span className="task-details__label">Assignee</span>
            <span>{task.assignee}</span>
          </div>
          <div className="task-details__info">
            <span className="task-details__label">Due date</span>
            <span>{formatDueDate(task.dueDate)}</span>
          </div>
        </div>

        <section className="task-details__section">
          <div className="task-details__section-head">
            <h3>Description</h3>
          </div>
          <p className="task-details__description">
            {task.description || 'No description provided for this task yet.'}
          </p>
        </section>

        <section className="task-details__section">
          <div className="task-details__section-head">
            <h3>Checklist</h3>
          </div>

          <label className="task-details__check">
            <input type="checkbox" checked={task.completed} onChange={onToggleCompleted} />
            <span>{task.completed ? 'Task completed' : 'Mark task as completed'}</span>
          </label>
        </section>

        <section className="task-details__section">
          <div className="task-details__section-head">
            <h3>Comments</h3>
            <span className="task-details__comment-count">{task.comments.length}</span>
          </div>

          <div className="task-details__comments">
            {task.comments.length ? (
              task.comments.map((comment) => (
                <article key={comment.id} className="task-details__comment">
                  <div className="task-details__comment-head">
                    <strong>{comment.author}</strong>
                    <span>{formatCommentTimestamp(comment.createdAt)}</span>
                  </div>
                  <p>{comment.message}</p>
                </article>
              ))
            ) : (
              <p className="task-details__empty">No comments yet.</p>
            )}
          </div>

          <form className="task-details__comment-form" onSubmit={onCommentSubmit}>
            <textarea
              className="task-details__textarea"
              name="comment"
              value={commentDraft}
              onChange={onCommentChange}
              placeholder="Add a comment"
              rows="4"
            />
            <div className="task-details__actions">
              <button className="task-details__button" type="submit">
                Add Comment
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
