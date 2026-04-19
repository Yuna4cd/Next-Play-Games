
import { useState } from 'react'

export default function Header({
  title = 'KbBoard',
  searchPlaceholder = 'Search tasks, tags, or assignees',
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)

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
        <div className="header__search">
          <input
            className="header__search-input"
            type="search"
            name="search"
            placeholder={searchPlaceholder}
            aria-label="Search tasks"
          />
        </div>
      </div>
    </header>
  )
}
