// ReviewBlock.jsx — Reviews section with rating breakdown

function ReviewBlock({ chalet }) {
  const { REVIEWS } = window.KBN_DATA;
  return (
    <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: 40, marginTop: 24 }}>
      <h3 style={{
        fontFamily: 'var(--font-sans)', fontSize: 26, fontWeight: 600,
        letterSpacing: '-0.015em', color: 'var(--fg-1)',
        margin: 0,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ color: 'var(--ember-500)' }}>★</span>
        {chalet.rating?.toString().replace('.', ',')} · {chalet.reviews} avis
      </h3>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 36, marginTop: 28,
        maxWidth: 880,
      }}>
        {REVIEWS.map((r, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 999,
                background: r.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--snow-warm)',
                fontFamily: 'var(--font-display)', fontSize: 22,
              }}>{r.initial}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--fg-1)' }}>{r.name}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-3)' }}>{r.date}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 2, color: 'var(--ember-500)', fontSize: 14 }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <span key={j} style={{ opacity: j < r.rating ? 1 : 0.25 }}>★</span>
              ))}
            </div>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.55,
              color: 'var(--fg-1)', margin: 0,
              textWrap: 'pretty',
            }}>{r.text}</p>
          </div>
        ))}
      </div>

      <button style={{
        marginTop: 32,
        background: 'transparent',
        border: '1px solid var(--char-800)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 22px',
        fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
        color: 'var(--fg-1)',
        cursor: 'pointer',
      }}>
        Afficher les {chalet.reviews} avis
      </button>
    </div>
  );
}

Object.assign(window, { ReviewBlock });
