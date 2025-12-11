export default function PortalNav({ active, onSelect, user }) {
  const tabs = [
    { id: 'user', label: 'User', description: 'Submit CV' },
    { id: 'admin', label: 'Admin', description: 'Review CVs' }
  ];

  return (
    <nav className="portal-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={active === tab.id ? 'active' : ''}
          onClick={() => onSelect(tab.id)}
        >
          <div className="avatar">{tab.id === 'admin' ? 'A' : 'U'}</div>
          <div>
            <strong>{tab.label}</strong>
            <p>{tab.description}</p>
          </div>
        </button>
      ))}
      {user && (
        <div className="portal-current">
          <span>Signed in as</span>
          <strong>{user.email}</strong>
        </div>
      )}
    </nav>
  );
}

