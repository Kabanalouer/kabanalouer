// CategoryStrip.jsx — Horizontal filter pills with icons

function CategoryStrip({ active = 'all', onChange }) {
  const { REGIONS } = window.KBN_DATA;
  return (
    <div style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: '24px 32px 12px',
      display: 'flex', alignItems: 'center',
      gap: 8,
      overflowX: 'auto',
      borderBottom: '1px solid var(--border-1)',
    }}>
      {REGIONS.map(r => {
        const isActive = active === r.id;
        return (
          <button
            key={r.id}
            onClick={() => onChange && onChange(r.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '8px 12px 12px',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--char-800)' : '2px solid transparent',
              cursor: 'pointer',
              color: isActive ? 'var(--fg-1)' : 'var(--fg-3)',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 500,
              flexShrink: 0,
              transition: 'color 140ms var(--ease-out)',
            }}
          >
            <LucideIcon name={r.icon} size={22} stroke={1.75} />
            <span>{r.label}</span>
          </button>
        );
      })}

      <div style={{ flex: 1 }} />
      <button style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px',
        background: 'var(--snow)',
        border: '1px solid var(--char-200)',
        borderRadius: 12,
        color: 'var(--fg-1)',
        fontFamily: 'var(--font-sans)',
        fontSize: 13, fontWeight: 500,
        cursor: 'pointer',
        flexShrink: 0,
      }}>
        <LucideIcon name="sliders-horizontal" size={15} />
        Filtres
      </button>
    </div>
  );
}

Object.assign(window, { CategoryStrip });
