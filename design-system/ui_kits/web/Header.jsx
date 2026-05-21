// Header.jsx — Top navigation + compact search

const { useState } = React;

function LucideIcon({ name, size = 18, stroke = 1.75, ...rest }) {
  // Renders a Lucide icon by inserting an <i data-lucide> and triggering createIcons on mount.
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({
        attrs: { 'stroke-width': stroke, width: size, height: size }
      });
    }
  }, [name, size, stroke]);
  return <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center' }} {...rest} />;
}

function Logo({ onClick }) {
  return (
    <div className="kbn-logo" onClick={onClick} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src="../../assets/logo-mark.svg" alt="" style={{ height: 32, width: 32 }} />
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: '-0.04em',
        color: 'var(--coral-500)',
        lineHeight: 1,
      }}>kabanalouer</span>
    </div>
  );
}

function CompactSearch({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--snow)',
        border: '1px solid var(--char-200)',
        borderRadius: 999,
        padding: '6px 6px 6px 18px',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: 'var(--fg-1)',
        gap: 0,
      }}
    >
      <span style={{ fontWeight: 600 }}>N'importe où</span>
      <span style={{ width: 1, height: 22, background: 'var(--char-100)', margin: '0 14px' }} />
      <span style={{ fontWeight: 600 }}>N'importe quelle semaine</span>
      <span style={{ width: 1, height: 22, background: 'var(--char-100)', margin: '0 14px' }} />
      <span style={{ color: 'var(--fg-3)' }}>Voyageurs</span>
      <span style={{
        marginLeft: 14,
        width: 34, height: 34,
        background: 'var(--ember-500)',
        color: 'var(--snow-warm)',
        borderRadius: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <LucideIcon name="search" size={15} stroke={2} />
      </span>
    </button>
  );
}

function Header({ onLogoClick, page }) {
  const compact = page !== 'home';
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(251, 248, 243, 0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-1)',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 24,
      }}>
        <Logo onClick={onLogoClick} />
        {compact && <CompactSearch onClick={onLogoClick} />}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <a style={navLink}>Devenir hôte</a>
          <a style={navLink}>
            <LucideIcon name="globe" size={16} stroke={1.75} />
            <span style={{ marginLeft: 6 }}>FR</span>
          </a>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--snow)',
            border: '1px solid var(--char-200)',
            borderRadius: 999,
            padding: '6px 6px 6px 12px',
            cursor: 'pointer',
            color: 'var(--fg-1)',
          }}>
            <LucideIcon name="menu" size={16} />
            <span style={{
              width: 30, height: 30, borderRadius: 999,
              background: 'var(--char-700)',
              color: 'var(--snow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
            }}>M</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

const navLink = {
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--fg-1)',
  padding: '10px 14px',
  borderRadius: 999,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
};

Object.assign(window, { Header, Logo, LucideIcon, CompactSearch });
