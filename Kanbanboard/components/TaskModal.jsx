export default function TaskModal({
  isOpen,
  formData,
  onChange,
  onTagChange,
  onAddTag,
  onRemoveTag,
  onClose,
  onSubmit,
  columnTitle,
  isSaving = false,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
      <div className="task-modal__backdrop" onClick={onClose} />

      <div className="task-modal__panel">
        <div className="task-modal__header">
          <div>
            <p className="task-modal__eyebrow">New Task</p>
            <h2 className="task-modal__title" id="task-modal-title">
              Add task to {columnTitle}
            </h2>
          </div>

          <button className="task-modal__close" type="button" onClick={onClose} aria-label="Close task form">
            x
          </button>
        </div>

        <form className="task-modal__form" onSubmit={onSubmit}>
          <label className="task-modal__field">
            <span>Title</span>
            <input
              autoFocus
              className="task-modal__input"
              type="text"
              name="title"
              value={formData.title}
              onChange={onChange}
              placeholder="Enter task title"
              required
            />
          </label>

          <label className="task-modal__field">
            <span>Description</span>
            <textarea
              className="task-modal__input task-modal__textarea"
              name="description"
              value={formData.description}
              onChange={onChange}
              placeholder="Add task context, notes, or acceptance criteria"
              rows="4"
            />
          </label>

          <div className="task-modal__field">
            <div className="task-modal__field-head">
              <span>Tags</span>
              <button className="task-modal__tag-add" type="button" onClick={onAddTag} aria-label="Add tag">
                +
              </button>
            </div>
            <div className="task-modal__tag-list">
              {formData.tags.map((tag, index) => (
                <div key={`task-tag-${index}`} className="task-modal__tag-row">
                  <input
                    className="task-modal__input"
                    type="text"
                    value={tag}
                    onChange={(event) => onTagChange(index, event.target.value)}
                    placeholder="Frontend, QA, Design..."
                  />
                  {formData.tags.length > 1 ? (
                    <button
                      className="task-modal__tag-remove"
                      type="button"
                      onClick={() => onRemoveTag(index)}
                      aria-label={`Remove tag ${index + 1}`}
                    >
                      x
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="task-modal__row">
            <label className="task-modal__field">
              <span>Priority</span>
              <select
                className="task-modal__input"
                name="priority"
                value={formData.priority}
                onChange={onChange}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Done">Done</option>
              </select>
            </label>

            <label className="task-modal__field">
              <span>Due date</span>
              <input
                className="task-modal__input"
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={onChange}
              />
            </label>
          </div>

          <label className="task-modal__field">
            <span>Assignee</span>
            <input
              className="task-modal__input"
              type="text"
              name="assignee"
              value={formData.assignee}
              onChange={onChange}
              placeholder="Who owns this task?"
            />
          </label>

          <div className="task-modal__actions">
            <button className="task-modal__button task-modal__button--ghost" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button className="task-modal__button task-modal__button--primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
