// SearchHero.jsx — Big homepage hero with search

function SearchHero() {
  return (
    <section style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: '64px 32px 32px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--coral-600)',
        marginBottom: 14,
      }}>
        Plus de 2&nbsp;400 chalets vérifiés au Québec
      </div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 64,
        fontWeight: 800,
        lineHeight: 1.04,
        letterSpacing: '-0.035em',
        color: 'var(--char-800)',
        margin: 0,
        maxWidth: 920, marginInline: 'auto',
      }}>
        Le Québec, un <em style={{ fontStyle: 'normal', color: 'var(--coral-500)' }}>chalet</em> à la fois.
      </h1>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 18,
        lineHeight: 1.55,
        color: 'var(--fg-2)',
        margin: '20px auto 36px',
        maxWidth: 600,
      }}>
        Trouvez votre prochaine escapade en bord de lac, en forêt ou en montagne. Réservez directement auprès des propriétaires.
      </p>

      <BigSearch />
    </section>
  );
}

function BigSearch() {
  const [activeSeg, setActiveSeg] = React.useState('destination');
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'stretch',
      background: 'var(--snow)',
      border: '1px solid var(--char-200)',
      borderRadius: 999,
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden',
      maxWidth: 760, width: '100%',
    }}>
      <Seg id="destination" lbl="Destination" val="Estrie" active={activeSeg} setActive={setActiveSeg} flex={1.5} />
      <Seg id="in" lbl="Arrivée" val="18 juil." active={activeSeg} setActive={setActiveSeg} />
      <Seg id="out" lbl="Départ" val="21 juil." active={activeSeg} setActive={setActiveSeg} />
      <Seg id="guests" lbl="Voyageurs" val="4 voyageurs" active={activeSeg} setActive={setActiveSeg} />
      <button style={{
        margin: 6,
        background: 'var(--ember-500)',
        color: 'var(--snow-warm)',
        border: 'none',
        borderRadius: 999,
        width: 56, height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        gap: 6,
      }}>
        <LucideIcon name="search" size={20} stroke={2} />
      </button>
    </div>
  );
}

function Seg({ id, lbl, val, active, setActive, flex = 1 }) {
  const isActive = active === id;
  return (
    <div
      onClick={() => setActive(id)}
      style={{
        flex,
        padding: '14px 22px',
        cursor: 'pointer',
        background: isActive ? 'var(--birch-50)' : 'transparent',
        borderRight: '1px solid var(--char-100)',
        display: 'flex', flexDirection: 'column', gap: 2,
        textAlign: 'left',
        transition: 'background 140ms var(--ease-out)',
      }}
    >
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--fg-1)',
      }}>{lbl}</span>
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: val ? 'var(--fg-1)' : 'var(--fg-3)',
      }}>{val || 'Ajouter'}</span>
    </div>
  );
}

Object.assign(window, { SearchHero, BigSearch, Seg });
