export default function Navbar({
  logo = 'NextPlay',
  username = 'Maya Chen',
}) {
  const initials = username
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <nav className="navbar" aria-label="Primary">
      <div className="navbar__brand">
        <span className="navbar__logo-mark" aria-hidden="true">
          NP
        </span>
        <div className="navbar__logo-copy">
          <span className="navbar__logo-label">{logo}</span>
          <span className="navbar__logo-subtitle">KanbanBoard</span>
        </div>
      </div>

      <div className="navbar__user">
        <div className="navbar__user-copy">
          <span className="navbar__user-label">Signed in as</span>
          <span className="navbar__username">{username}</span>
        </div>
        <span className="navbar__avatar" aria-hidden="true">
          {initials}
        </span>
      </div>
    </nav>
  )
}
