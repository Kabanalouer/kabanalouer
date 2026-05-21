// MobileScreens.jsx — three screens for the Kabanalouer iOS prototype

// =========== EXPLORE / HOME SCREEN ===========
function ExploreScreen({ onChaletTap }) {
  const { CHALETS, REGIONS } = window.KBN_DATA;
  const [cat, setCat] = React.useState('all');
  return (
    <div style={{ paddingTop: 60, paddingBottom: 110, background: '#fbf8f3', minHeight: '100%' }}>
      {/* Search field */}
      <div style={{ padding: '8px 16px 12px' }}>
        <div style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 999,
          padding: '12px 18px',
          boxShadow: '0 6px 16px rgba(35,30,22,0.07), 0 2px 4px rgba(35,30,22,0.04)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <MIcon name="search" size={18} stroke={2}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>Où allez-vous&nbsp;?</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-3)' }}>N'importe quand · Voyageurs</div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: 999,
            background: 'var(--snow)', border: '1px solid var(--char-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <MIcon name="sliders-horizontal" size={15}/>
          </div>
        </div>
      </div>

      {/* Categories strip */}
      <div style={{
        padding: '4px 16px 16px',
        overflowX: 'auto',
        display: 'flex', gap: 18,
        WebkitOverflowScrolling: 'touch',
      }}>
        {REGIONS.slice(0, 8).map(r => {
          const active = cat === r.id;
          return (
            <button key={r.id} onClick={() => setCat(r.id)} style={{
              flexShrink: 0, background: 'transparent', border: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              paddingBottom: 8,
              borderBottom: active ? '2px solid var(--char-800)' : '2px solid transparent',
              color: active ? 'var(--fg-1)' : 'var(--fg-3)',
              cursor: 'pointer',
            }}>
              <MIcon name={r.icon} size={22} stroke={1.6}/>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500 }}>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Listings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '4px 16px 16px' }}>
        {CHALETS.slice(0, 4).map(c => (
          <MobileListing key={c.id} chalet={c} onClick={() => onChaletTap(c)} />
        ))}
      </div>

      {/* Tab bar */}
      <MobileTabBar active="explore" />
    </div>
  );
}

function MobileListing({ chalet, onClick }) {
  const [fav, setFav] = React.useState(chalet.favorite || false);
  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{
        aspectRatio: '4/3', borderRadius: 16, overflow: 'hidden',
        background: chalet.photoBg, position: 'relative',
      }}>
        {chalet.badge && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            padding: '5px 11px', borderRadius: 999,
            background: 'var(--snow)',
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            color: 'var(--char-800)',
            boxShadow: 'var(--shadow-xs)',
          }}>{chalet.badge}</div>
        )}
        <button onClick={(e) => { e.stopPropagation(); setFav(f => !f); }} style={{
          position: 'absolute', top: 10, right: 10,
          width: 34, height: 34, borderRadius: 999,
          background: 'rgba(255,255,255,0.85)', border: 'none',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: fav ? 'var(--danger)' : 'var(--char-700)',
          cursor: 'pointer',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke={fav ? 'white' : 'currentColor'} strokeWidth="2">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>
          </svg>
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{chalet.region.split(',')[0]}</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-1)' }}>
          <span style={{ color: 'var(--ember-500)' }}>★</span> {chalet.rating?.toString().replace('.', ',')}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-3)', marginTop: 2 }}>
        {chalet.distance}
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-1)', marginTop: 4 }}>
        <b style={{ fontWeight: 600 }}>{chalet.price} $</b> CAD /nuit
      </div>
    </div>
  );
}

// =========== CHALET DETAIL SCREEN ===========
function DetailScreen({ chalet, onBack, onReserve }) {
  return (
    <div style={{ paddingBottom: 110, background: 'var(--bg-page)', minHeight: '100%' }}>
      {/* Hero photo */}
      <div style={{
        height: 320, background: chalet.photoBg, position: 'relative',
      }}>
        <button onClick={onBack} style={{
          position: 'absolute', top: 60, left: 16,
          width: 36, height: 36, borderRadius: 999,
          background: 'var(--snow)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)',
          color: 'var(--fg-1)',
          cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ position: 'absolute', top: 60, right: 16, display: 'flex', gap: 8 }}>
          {['share-2','heart'].map(n => (
            <button key={n} style={{
              width: 36, height: 36, borderRadius: 999,
              background: 'var(--snow)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              color: 'var(--fg-1)',
              cursor: 'pointer',
            }}>
              <MIcon name={n} size={16}/>
            </button>
          ))}
        </div>
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          padding: '4px 10px', borderRadius: 999,
          background: 'rgba(0,0,0,0.55)',
          color: 'var(--snow-warm)',
          fontFamily: 'var(--font-mono)', fontSize: 11,
        }}>1 / {chalet.gallery?.length || 5}</div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 18px 24px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800,
          lineHeight: 1.15, letterSpacing: '-0.025em',
          color: 'var(--char-800)', margin: 0,
        }}>{chalet.title}</h1>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-3)', marginTop: 4 }}>
          {chalet.region} · {chalet.guests} voyageurs · {chalet.beds} chambres
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-1)', marginTop: 8 }}>
          <span style={{ color: 'var(--ember-500)' }}>★</span> <b>{chalet.rating?.toString().replace('.', ',')}</b> · {chalet.reviews} avis · {chalet.distance}
        </div>

        {/* Host card */}
        {chalet.host && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 0',
            marginTop: 16,
            borderTop: '1px solid var(--border-1)',
            borderBottom: '1px solid var(--border-1)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 999,
              background: chalet.host.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--snow-warm)',
              fontFamily: 'var(--font-display)', fontSize: 22,
            }}>{chalet.host.initial}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>Hébergé par {chalet.host.name}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-3)' }}>Hôte vérifié · depuis {chalet.host.since}</div>
            </div>
          </div>
        )}

        {/* Description */}
        {chalet.description && (
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.55,
            color: 'var(--fg-1)', margin: '16px 0 0', textWrap: 'pretty',
          }}>{chalet.description}</p>
        )}

        {/* Amenities preview */}
        {chalet.amenities && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 600, color: 'var(--fg-1)', margin: '0 0 12px' }}>Ce chalet offre</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
              {chalet.amenities.slice(0, 6).map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MIcon name={a.icon} size={18} stroke={1.5}/>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-1)' }}>{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div style={{
        position: 'absolute', bottom: 34, left: 0, right: 0,
        padding: '12px 18px 14px',
        background: 'rgba(251,248,243,0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-1)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--fg-1)' }}>{chalet.price} $ <span style={{ fontWeight: 400, color: 'var(--fg-3)', fontSize: 13 }}>/ nuit</span></div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-3)', textDecoration: 'underline' }}>18 – 21 juil.</div>
        </div>
        <button onClick={() => onReserve(chalet)} style={{
          background: 'var(--ember-500)', color: 'var(--snow-warm)',
          border: 'none', borderRadius: 12,
          padding: '14px 28px',
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
          cursor: 'pointer',
        }}>Réserver</button>
      </div>
    </div>
  );
}

// =========== TRIPS SCREEN ===========
function TripsScreen() {
  const { CHALETS } = window.KBN_DATA;
  const trip = CHALETS[0];
  return (
    <div style={{ paddingTop: 60, paddingBottom: 110, background: 'var(--bg-page)', minHeight: '100%' }}>
      <div style={{ padding: '8px 18px 16px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800,
          letterSpacing: '-0.03em', color: 'var(--char-800)', margin: 0, lineHeight: 1.1,
        }}>Mes voyages</h1>
      </div>

      <div style={{ padding: '4px 18px 8px' }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ember-600)',
          marginBottom: 8,
        }}>À venir</div>

        <div style={{
          background: 'var(--snow)', borderRadius: 16,
          boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
        }}>
          <div style={{ height: 160, background: trip.photoBg, position: 'relative' }}>
            <div style={{
              position: 'absolute', bottom: 10, left: 10,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(61,112,72,0.92)',
              color: 'var(--snow-warm)',
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            }}>Dans 12 jours</div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--fg-1)' }}>{trip.title}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-3)', marginTop: 2 }}>{trip.region}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <Cell lbl="Arrivée" val="18 juil." />
              <Cell lbl="Départ" val="21 juil." />
              <Cell lbl="Voyageurs" val="4 + 1" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={{
                flex: 1, background: 'var(--char-800)', color: 'var(--snow-warm)',
                border: 'none', borderRadius: 10, padding: '11px 14px',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer',
              }}>
                <MIcon name="message-circle" size={14}/>
                Écrire à Marie-Pier
              </button>
              <button style={{
                background: 'var(--snow)', color: 'var(--fg-1)',
                border: '1px solid var(--char-200)', borderRadius: 10,
                padding: '11px 14px',
                cursor: 'pointer',
              }}>
                <MIcon name="map-pin" size={14}/>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 18px 0' }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)',
          marginBottom: 12,
        }}>Voyages passés</div>
        {[CHALETS[1], CHALETS[2]].map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-1)' }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: c.photoBg, flexShrink: 0, filter: 'saturate(0.6)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-3)' }}>{c.region}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-2)', marginTop: 4 }}>
                <span style={{ color: 'var(--ember-500)' }}>★</span> {c.rating?.toString().replace('.', ',')} · Mars 2025
              </div>
            </div>
            <MIcon name="chevron-right" size={16}/>
          </div>
        ))}
      </div>

      <MobileTabBar active="trips" />
    </div>
  );
}

function Cell({ lbl, val }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{lbl}</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-1)', marginTop: 2, fontWeight: 600 }}>{val}</span>
    </div>
  );
}

// =========== TAB BAR ===========
function MobileTabBar({ active }) {
  const tabs = [
    { id: 'explore',  label: 'Explorer', icon: 'search' },
    { id: 'wishlist', label: 'Favoris',  icon: 'heart' },
    { id: 'trips',    label: 'Voyages',  icon: 'briefcase' },
    { id: 'inbox',    label: 'Messages', icon: 'message-circle' },
    { id: 'profile',  label: 'Profil',   icon: 'circle-user' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingBottom: 28,
      background: 'rgba(251,248,243,0.94)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid var(--border-1)',
      display: 'flex', justifyContent: 'space-around',
      paddingTop: 10,
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <div key={t.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            color: isActive ? 'var(--ember-600)' : 'var(--fg-3)',
          }}>
            <MIcon name={t.icon} size={22} stroke={isActive ? 2 : 1.5}/>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: isActive ? 600 : 500 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// =========== Lucide icon wrapper (renamed to avoid clash) ===========
function MIcon({ name, size = 18, stroke = 1.75 }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({ attrs: { 'stroke-width': stroke, width: size, height: size } });
    }
  }, [name, size, stroke]);
  return <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center' }} />;
}

Object.assign(window, { ExploreScreen, DetailScreen, TripsScreen, MobileTabBar, MobileListing, MIcon });
