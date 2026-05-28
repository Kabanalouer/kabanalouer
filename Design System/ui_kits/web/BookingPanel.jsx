// BookingPanel.jsx — Sticky right-side booking widget

function BookingPanel({ chalet, onReserve }) {
  const nights = 3;
  const subtotal = chalet.price * nights;
  const cleaning = 85;
  const service = 52;
  const total = subtotal + cleaning + service;

  return (
    <div style={{
      background: 'var(--snow)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--char-100)',
      padding: 24,
      boxShadow: 'var(--shadow-lg)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 24, fontWeight: 700, color: 'var(--fg-1)' }}>{chalet.price} $</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--fg-3)' }}>/ nuit</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-1)' }}>
          <span style={{ color: 'var(--ember-500)' }}>★</span> {chalet.rating?.toString().replace('.', ',')} · {chalet.reviews} avis
        </span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        border: '1px solid var(--char-200)', borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}>
        <DateField lbl="Arrivée" val="18 juil. 2026" />
        <DateField lbl="Départ" val="21 juil. 2026" border />
      </div>
      <div style={{
        border: '1px solid var(--char-200)', borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', cursor: 'pointer',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Voyageurs</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-1)', marginTop: 2 }}>4 adultes · 1 enfant</div>
        </div>
        <LucideIcon name="chevron-down" size={16} />
      </div>

      <button onClick={() => onReserve && onReserve(chalet)} style={{
        background: 'var(--ember-500)', color: 'var(--snow-warm)',
        border: 'none', borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 140ms var(--ease-out)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ember-600)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--ember-500)'}
      >Réserver</button>

      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-3)', textAlign: 'center' }}>
        Vous ne serez pas débité tout de suite.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
        <Row a={`${chalet.price} $ × ${nights} nuits`} b={`${subtotal} $`} />
        <Row a="Frais de ménage" b={`${cleaning} $`} />
        <Row a="Frais de service" b={`${service} $`} />
        <div style={{
          borderTop: '1px solid var(--border-1)',
          paddingTop: 10, marginTop: 4,
          display: 'flex', justifyContent: 'space-between',
          fontWeight: 600, fontSize: 15, color: 'var(--fg-1)',
        }}>
          <span>Total</span><span>{total} $</span>
        </div>
      </div>
    </div>
  );
}

function DateField({ lbl, val, border }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderLeft: border ? '1px solid var(--char-200)' : 'none',
    }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{lbl}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-1)', marginTop: 2 }}>{val}</div>
    </div>
  );
}

function Row({ a, b }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{a}</span><span>{b}</span></div>;
}

Object.assign(window, { BookingPanel, DateField });
