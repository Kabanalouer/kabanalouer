// ListingCard.jsx — Photo-led chalet card

function ListingCard({ chalet, onClick }) {
  const [favorite, setFavorite] = React.useState(chalet.favorite || false);
  const [imageIdx, setImageIdx] = React.useState(0);
  const gallery = chalet.gallery || [chalet.photoBg];

  return (
    <div onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      cursor: 'pointer',
    }}>
      <div style={{
        aspectRatio: '20/19',
        borderRadius: 'var(--radius-lg)',
        background: gallery[imageIdx],
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xs)',
      }}>
        {chalet.badge && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            padding: '6px 12px',
            borderRadius: 999,
            background: 'var(--snow)',
            fontFamily: 'var(--font-sans)',
            fontSize: 11, fontWeight: 600,
            color: 'var(--char-800)',
            boxShadow: 'var(--shadow-xs)',
          }}>{chalet.badge}</div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setFavorite(f => !f); }}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 34, height: 34, borderRadius: 999,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: favorite ? 'var(--danger)' : 'var(--char-700)',
            transition: 'transform 180ms var(--ease-spring)',
            transform: favorite ? 'scale(1.05)' : 'scale(1)',
          }}
          aria-label="Favori"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"
               fill={favorite ? 'currentColor' : 'none'}
               stroke={favorite ? 'white' : 'currentColor'}
               strokeWidth="2">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>
          </svg>
        </button>
        {gallery.length > 1 && (
          <>
            <CarouselArrow dir="left"  onClick={(e) => { e.stopPropagation(); setImageIdx(i => Math.max(0, i - 1)); }} disabled={imageIdx === 0} />
            <CarouselArrow dir="right" onClick={(e) => { e.stopPropagation(); setImageIdx(i => Math.min(gallery.length - 1, i + 1)); }} disabled={imageIdx === gallery.length - 1} />
            <div style={{
              position: 'absolute', bottom: 10, left: 0, right: 0,
              display: 'flex', justifyContent: 'center', gap: 4,
            }}>
              {gallery.map((_, i) => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: 999,
                  background: i === imageIdx ? 'var(--snow)' : 'rgba(255,255,255,0.55)',
                  transition: 'all 140ms var(--ease-out)',
                }}/>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 15, fontWeight: 600,
          color: 'var(--fg-1)',
          lineHeight: 1.3,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
        }}>{chalet.title}</span>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13, color: 'var(--fg-1)',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          flexShrink: 0,
        }}>
          <span style={{ color: 'var(--ember-500)' }}>★</span> {chalet.rating?.toString().replace('.', ',')}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-3)' }}>
        {chalet.region} · {chalet.guests} voyageurs · {chalet.beds} chambres
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-1)' }}>
        <b style={{ fontWeight: 600 }}>{chalet.price} $</b> /nuit
      </div>
    </div>
  );
}

function CarouselArrow({ dir, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        [dir]: 10,
        width: 30, height: 30, borderRadius: 999,
        background: 'var(--snow)',
        border: '1px solid var(--char-100)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 0.95,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)',
        color: 'var(--char-800)',
        padding: 0,
      }}
      aria-label={dir === 'left' ? 'Précédent' : 'Suivant'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        {dir === 'left'
          ? <polyline points="15 18 9 12 15 6"/>
          : <polyline points="9 18 15 12 9 6"/>}
      </svg>
    </button>
  );
}

function ListingGrid({ chalets, onChaletClick }) {
  return (
    <div style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: '24px 32px 64px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
      gap: '32px 22px',
    }}>
      {chalets.map(c => (
        <ListingCard key={c.id} chalet={c} onClick={() => onChaletClick && onChaletClick(c)} />
      ))}
    </div>
  );
}

Object.assign(window, { ListingCard, ListingGrid, CarouselArrow });
