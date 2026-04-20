export default function ColumnDetail({
  isOpen,
  column,
  isEditing,
  titleDraft,
  toneDraft,
  onFieldChange,
  onEditStart,
  onEditCancel,
  onSubmit,
  onClose,
}) {
  if (!isOpen || !column) {
    return null
  }

  return (
    <div className="column-detail" role="dialog" aria-modal="true" aria-labelledby="column-detail-title">
      <div className="column-detail__backdrop" onClick={onClose} />

      <div className="column-detail__panel">
        <div className="column-detail__header">
          <div>
            <p className="column-detail__eyebrow">Column Detail</p>
            {isEditing ? (
              <form className="column-detail__title-form" onSubmit={onSubmit}>
                <input
                  className="column-detail__title-input"
                  id="column-detail-title"
                  name="titleDraft"
                  value={titleDraft}
                  onChange={onFieldChange}
                  aria-label="Column title"
                />
                <div className="column-detail__actions">
                  <button className="column-detail__button column-detail__button--ghost" type="button" onClick={onEditCancel}>
                    Cancel
                  </button>
                  <button className="column-detail__button" type="submit">
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="column-detail__title-row">
                <h2 className="column-detail__title" id="column-detail-title">
                  {column.title}
                </h2>
                <button className="column-detail__button column-detail__button--ghost" type="button" onClick={onEditStart}>
                  Edit
                </button>
              </div>
            )}
          </div>

          <button className="column-detail__close" type="button" onClick={onClose} aria-label="Close column details">
            x
          </button>
        </div>

        <div className="column-detail__meta">
          {isEditing ? (
            <select className="column-detail__select" name="toneDraft" value={toneDraft} onChange={onFieldChange} aria-label="Column tone">
              <option value="default">Default</option>
              <option value="amber">Amber</option>
              <option value="blue">Blue</option>
              <option value="violet">Violet</option>
              <option value="green">Green</option>
            </select>
          ) : (
            <span className={`column-detail__tone column-detail__tone--${column.tone || 'default'}`}>{column.tone || 'default'}</span>
          )}
          <span className="column-detail__count">{column.tasks.length} tasks</span>
        </div>

        <div className="column-detail__grid">
          <div className="column-detail__info">
            <span className="column-detail__label">Column ID</span>
            <span>{column.id}</span>
          </div>
          <div className="column-detail__info">
            <span className="column-detail__label">Task Count</span>
            <span>{column.tasks.length}</span>
          </div>
        </div>

        <section className="column-detail__section">
          <div className="column-detail__section-head">
            <h3>Tasks</h3>
          </div>

          <div className="column-detail__tasks">
            {column.tasks.length ? (
              column.tasks.map((task) => (
                <article key={task.id} className="column-detail__task">
                  <strong>{task.title}</strong>
                  <span>{task.assignee}</span>
                </article>
              ))
            ) : (
              <p className="column-detail__empty">No tasks in this column.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
