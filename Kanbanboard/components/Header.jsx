import { useState } from 'react'

export default function Header({
  title = 'KbBoard',
  searchPlaceholder = 'Search tasks, tags, or assignees',
  searchValue = '',
  onSearchChange,
  filters = {
    label: '',
    priority: '',
    assignee: '',
  },
  filterOptions = {
    labels: [],
    priorities: [],
    assignees: [],
  },
  onFilterChange,
  onClearFilters,
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  function handleTitleSubmit(event) {
    event.preventDefault()

    if (!draftTitle.trim()) {
      setDraftTitle(title)
    }

    setIsEditingTitle(false)
  }

  return (
    <header className="header">
      <div className="header__title-group">
        <p className="header__eyebrow">Workspace</p>
        <div className="header__title">
          {isEditingTitle ? (
            <form className="header__title-form" onSubmit={handleTitleSubmit}>
              <input
                className="header__title-input"
                type="text"
                name="board-title"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                aria-label="Edit board title"
                autoFocus
              />
              <button className="header__edit-button" type="submit">
                Save
              </button>
            </form>
          ) : (
            <>
              <h1>{draftTitle}</h1>
              <button
                className="header__edit-button"
                type="button"
                onClick={() => setIsEditingTitle(true)}
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
      <div className="header__content">
        <div className="header__toolbar">
          <div className="header__search">
            <input
              className="header__search-input"
              type="search"
              name="search"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search tasks"
            />
          </div>

          <div className="header__filters">
            <button
              className={`header__filter-button${isFilterOpen ? ' header__filter-button--active' : ''}`}
              type="button"
              onClick={() => setIsFilterOpen((open) => !open)}
            >
              Filter
            </button>

            {isFilterOpen ? (
              <div className="header__filter-panel">
                <label className="header__filter-field">
                  <span>Tag</span>
                  <select
                    className="header__filter-select"
                    value={filters.label}
                    onChange={(event) => onFilterChange?.('label', event.target.value)}
                  >
                    <option value="">All tags</option>
                    {filterOptions.labels.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="header__filter-field">
                  <span>Priority</span>
                  <select
                    className="header__filter-select"
                    value={filters.priority}
                    onChange={(event) => onFilterChange?.('priority', event.target.value)}
                  >
                    <option value="">All priorities</option>
                    {filterOptions.priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="header__filter-field">
                  <span>Assignee</span>
                  <select
                    className="header__filter-select"
                    value={filters.assignee}
                    onChange={(event) => onFilterChange?.('assignee', event.target.value)}
                  >
                    <option value="">All assignees</option>
                    {filterOptions.assignees.map((assignee) => (
                      <option key={assignee} value={assignee}>
                        {assignee}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="header__clear-filters" type="button" onClick={onClearFilters}>
                  Clear filters
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
