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

function formatHistoryTimestamp(createdAt) {
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
  isEditing,
  titleDraft,
  tagsDraft,
  priorityDraft,
  assigneeDraft,
  onCommentChange,
  onCommentSubmit,
  onDetailsFieldChange,
  onTagDraftChange,
  onAddTagDraft,
  onRemoveTagDraft,
  onEditStart,
  onEditCancel,
  onDetailsSubmit,
  onClose,
  onToggleCompleted,
  onDeleteTask,
  renderHistoryEntry,
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
            {isEditing ? (
              <form className="task-details__title-form" onSubmit={onDetailsSubmit}>
                <input
                  className="task-details__title-input"
                  id="task-details-title"
                  name="titleDraft"
                  value={titleDraft}
                  onChange={onDetailsFieldChange}
                  aria-label="Task title"
                />
                <div className="task-details__title-actions">
                  <button className="task-details__button task-details__button--ghost" type="button" onClick={onEditCancel}>
                    Cancel
                  </button>
                  <button className="task-details__button" type="submit">
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="task-details__title-row">
                <h2 className="task-details__title" id="task-details-title">
                  {task.title}
                </h2>
                <button className="task-details__button task-details__button--ghost" type="button" onClick={onEditStart}>
                  Edit
                </button>
              </div>
            )}
          </div>

          <button className="task-details__close" type="button" onClick={onClose} aria-label="Close task details">
            x
          </button>
        </div>

        <div className="task-details__meta">
          {isEditing ? (
            <>
              <div className="task-details__tags-editor">
                <div className="task-details__tags-head">
                  <span className="task-details__label">Tags</span>
                  <button className="task-details__tag-add" type="button" onClick={onAddTagDraft} aria-label="Add tag">
                    +
                  </button>
                </div>
                <div className="task-details__tag-list">
                  {tagsDraft.map((tag, index) => (
                    <div key={`detail-tag-${index}`} className="task-details__tag-row">
                      <input
                        className="task-details__field-input task-details__field-input--chip"
                        type="text"
                        value={tag}
                        onChange={(event) => onTagDraftChange(index, event.target.value)}
                        aria-label={`Task tag ${index + 1}`}
                        placeholder="General"
                      />
                      {tagsDraft.length > 1 ? (
                        <button
                          className="task-details__tag-remove"
                          type="button"
                          onClick={() => onRemoveTagDraft(index)}
                          aria-label={`Remove tag ${index + 1}`}
                        >
                          x
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <select
                className="task-details__field-select"
                name="priorityDraft"
                value={priorityDraft}
                onChange={onDetailsFieldChange}
                aria-label="Task priority"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Done">Done</option>
              </select>
            </>
          ) : (
            <>
              <div className="task-details__chips">
                {task.tags?.map((tag) => (
                  <span key={tag} className="task-details__chip">
                    {tag}
                  </span>
                ))}
              </div>
              <span className={`task-card__priority task-card__priority--${task.priority.toLowerCase()}`}>
                {task.priority}
              </span>
            </>
          )}
        </div>

        <div className="task-details__grid">
          <div className="task-details__info">
            <span className="task-details__label">Assignee</span>
            {isEditing ? (
              <input
                className="task-details__field-input"
                type="text"
                name="assigneeDraft"
                value={assigneeDraft}
                onChange={onDetailsFieldChange}
                aria-label="Task assignee"
                placeholder="Unassigned"
              />
            ) : (
              <span>{task.assignee}</span>
            )}
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
            <h3>History</h3>
            <span className="task-details__comment-count">{task.history?.length || 0}</span>
          </div>

          <div className="task-details__history">
            {task.history?.length ? (
              task.history.map((entry) => (
                <article key={entry.id} className="task-details__history-item">
                  <div className="task-details__history-head">
                    <strong>{entry.actor}</strong>
                    <span>{formatHistoryTimestamp(entry.createdAt)}</span>
                  </div>
                  <p>{renderHistoryEntry(entry)}</p>
                </article>
              ))
            ) : (
              <p className="task-details__empty">No activity yet.</p>
            )}
          </div>
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
              <button className="task-details__button task-details__button--danger" type="button" onClick={onDeleteTask}>
                Delete Task
              </button>

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
