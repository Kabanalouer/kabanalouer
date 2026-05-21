// ChaletDetail.jsx — Chalet detail page with gallery, info, host, amenities

function ChaletDetail({ chalet, onReserve, onBack }) {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 64px' }}>
      <Breadcrumb onBack={onBack} />

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 40, fontWeight: 800,
        lineHeight: 1.1, letterSpacing: '-0.03em',
        color: 'var(--char-800)',
        margin: '8px 0 12px',
      }}>{chalet.title}</h1>

      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14,
        fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-2)',
        marginBottom: 22,
      }}>
        <span><span style={{ color: 'var(--ember-500)' }}>★</span> <b style={{ color: 'var(--fg-1)' }}>{chalet.rating?.toString().replace('.', ',')}</b> · {chalet.reviews} avis</span>
        <span>·</span>
        <span>{chalet.region}</span>
        <span>·</span>
        <span>{chalet.distance}</span>
        <div style={{ flex: 1 }} />
        <button style={iconBtn}>
          <LucideIcon name="share-2" size={15} stroke={1.75} />
          <span style={{ marginLeft: 6 }}>Partager</span>
        </button>
        <button style={iconBtn}>
          <LucideIcon name="heart" size={15} stroke={1.75} />
          <span style={{ marginLeft: 6 }}>Enregistrer</span>
        </button>
      </div>

      <Gallery gallery={chalet.gallery || [chalet.photoBg]} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: 64,
        marginTop: 40,
        alignItems: 'start',
      }}>
        <div>
          <HostSummary chalet={chalet} />
          <Highlights />
          <Description text={chalet.description} />
          <AmenitiesBlock amenities={chalet.amenities || []} />
        </div>
        <div style={{ position: 'sticky', top: 100 }}>
          <BookingPanel chalet={chalet} onReserve={onReserve} />
        </div>
      </div>

      <ReviewBlock chalet={chalet} />
    </div>
  );
}

function Breadcrumb({ onBack }) {
  return (
    <button onClick={onBack} style={{
      fontFamily: 'var(--font-sans)', fontSize: 13,
      color: 'var(--fg-2)',
      background: 'transparent', border: 'none',
      cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: 0,
    }}>
      <LucideIcon name="chevron-left" size={16} />
      Retour aux résultats
    </button>
  );
}

function Gallery({ gallery }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: 8,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      aspectRatio: '2 / 1',
    }}>
      <div style={{ gridRow: 'span 2', background: gallery[0] }} />
      <div style={{ background: gallery[1] || gallery[0] }} />
      <div style={{ background: gallery[2] || gallery[0] }} />
      <div style={{ background: gallery[3] || gallery[0] }} />
      <div style={{ background: gallery[4] || gallery[0], position: 'relative' }}>
        <button style={{
          position: 'absolute', bottom: 14, right: 14,
          padding: '8px 14px',
          background: 'var(--snow)',
          border: '1px solid var(--char-300)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
          color: 'var(--fg-1)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <LucideIcon name="grid-3x3" size={14} />
          Voir toutes les photos
        </button>
      </div>
    </div>
  );
}

function HostSummary({ chalet }) {
  const h = chalet.host;
  if (!h) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      paddingBottom: 24,
      borderBottom: '1px solid var(--border-1)',
    }}>
      <div style={{ flex: 1 }}>
        <h2 style={{
          fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600,
          letterSpacing: '-0.01em', color: 'var(--fg-1)',
          margin: 0,
        }}>Chalet hébergé par {h.name}</h2>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-2)', marginTop: 4 }}>
          {chalet.guests} voyageurs · {chalet.beds} chambres · {chalet.baths} salles de bain
        </div>
      </div>
      <div style={{
        width: 56, height: 56, borderRadius: 999,
        background: h.gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--snow-warm)',
        fontFamily: 'var(--font-display)', fontSize: 26,
      }}>{h.initial}</div>
    </div>
  );
}

function Highlights() {
  const items = [
    { icon: 'home',     title: 'Maison entière', sub: 'Vous aurez le chalet pour vous.' },
    { icon: 'sparkles', title: 'Très bien noté pour la propreté', sub: 'Selon les 87 derniers avis.' },
    { icon: 'map-pin',  title: 'À 5 min du lac', sub: 'À pied, par un sentier privé.' },
  ];
  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 18, borderBottom: '1px solid var(--border-1)' }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <LucideIcon name={it.icon} size={22} stroke={1.5} />
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--fg-1)' }}>{it.title}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-2)', marginTop: 2 }}>{it.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Description({ text }) {
  return (
    <div style={{ padding: '24px 0', borderBottom: '1px solid var(--border-1)' }}>
      <p style={{
        fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.6,
        color: 'var(--fg-1)', margin: 0,
        maxWidth: 620,
        textWrap: 'pretty',
      }}>{text}</p>
      <button style={{
        marginTop: 14,
        background: 'transparent', border: 'none', padding: 0,
        fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
        color: 'var(--fg-1)',
        textDecoration: 'underline',
        cursor: 'pointer',
      }}>Lire la suite →</button>
    </div>
  );
}

function AmenitiesBlock({ amenities }) {
  return (
    <div style={{ padding: '24px 0' }}>
      <h3 style={{
        fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600,
        letterSpacing: '-0.01em', color: 'var(--fg-1)',
        margin: '0 0 18px',
      }}>Ce que ce chalet offre</h3>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px',
        maxWidth: 580,
      }}>
        {amenities.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <LucideIcon name={a.icon} size={20} stroke={1.5} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-1)' }}>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const iconBtn = {
  background: 'transparent', border: 'none',
  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
  color: 'var(--fg-1)',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
};

Object.assign(window, { ChaletDetail, Gallery, HostSummary, Highlights, Description, AmenitiesBlock });
