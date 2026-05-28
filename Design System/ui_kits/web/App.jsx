// Footer.jsx + Homepage + ConfirmationPage + App

function Footer() {
  const cols = [
    { title: 'Découvrir', links: ['Comment ça marche', 'Régions populaires', 'Idées d\'escapades', 'Cartes-cadeaux'] },
    { title: 'Hôtes',     links: ['Devenir hôte', 'Centre d\'aide hôte', 'Forum communauté', 'Programme Ambassadeur'] },
    { title: 'Soutien',   links: ['Centre d\'aide', 'Sécurité', 'Politique d\'annulation', 'Nous joindre'] },
  ];
  return (
    <footer style={{ background: 'var(--birch-100)', marginTop: 80 }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        padding: '64px 32px 32px',
        display: 'grid',
        gridTemplateColumns: '1.4fr repeat(3, 1fr)',
        gap: 32,
      }}>
        <div>
          <img src="../../assets/logo-wordmark.svg" alt="Kabanalouer" style={{ height: 48 }} />
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.55,
            color: 'var(--fg-2)', maxWidth: 320, marginTop: 16, textWrap: 'pretty',
          }}>
            La marketplace de la location de chalets au Québec. Réservez directement auprès des propriétaires, partout au Québec.
          </p>
        </div>
        {cols.map((col, i) => (
          <div key={i}>
            <h4 style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
              color: 'var(--fg-1)', margin: '4px 0 14px',
            }}>{col.title}</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.links.map((l, j) => (
                <li key={j}>
                  <a style={{
                    fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)',
                    textDecoration: 'none', cursor: 'pointer',
                  }}>{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--char-200)', maxWidth: 1280, margin: '0 auto', padding: '20px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-3)' }}>
        <span>© 2026 Kabanalouer inc. · Tous droits réservés</span>
        <span style={{ display: 'flex', gap: 18 }}>
          <a style={{ color: 'inherit', cursor: 'pointer' }}>Confidentialité</a>
          <a style={{ color: 'inherit', cursor: 'pointer' }}>Conditions</a>
          <a style={{ color: 'inherit', cursor: 'pointer' }}>FR · CA $</a>
        </span>
      </div>
    </footer>
  );
}

function Homepage({ onChaletClick }) {
  const { CHALETS } = window.KBN_DATA;
  const [category, setCategory] = React.useState('all');
  return (
    <>
      <SearchHero />
      <CategoryStrip active={category} onChange={setCategory} />
      <SectionHeader />
      <ListingGrid chalets={CHALETS} onChaletClick={onChaletClick} />
      <Footer />
    </>
  );
}

function SectionHeader() {
  return (
    <div style={{
      maxWidth: 1280, margin: '0 auto',
      padding: '24px 32px 0',
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ember-600)',
        }}>Coups de cœur · Été 2026</div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-0.03em',
          color: 'var(--char-800)', margin: '4px 0 0',
        }}>Des chalets choisis avec soin.</h2>
      </div>
      <a style={{
        fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
        color: 'var(--fg-1)',
        textDecoration: 'underline',
        textUnderlineOffset: 4,
        cursor: 'pointer',
      }}>Tout voir →</a>
    </div>
  );
}

function ConfirmationPage({ chalet, onHome }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 32px 64px' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 999,
        background: 'var(--forest-500)', color: 'var(--snow-warm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800,
        lineHeight: 1.05, letterSpacing: '-0.03em',
        color: 'var(--char-800)',
        margin: '24px 0 12px',
      }}>C'est confirmé. <em style={{ fontStyle: 'normal', color: 'var(--coral-500)' }}>Bon séjour</em>, Marie&nbsp;!</h1>
      <p style={{
        fontFamily: 'var(--font-sans)', fontSize: 18, lineHeight: 1.55,
        color: 'var(--fg-2)', margin: '0 0 24px', maxWidth: 560, textWrap: 'pretty',
      }}>
        Votre chalet <b style={{ color: 'var(--fg-1)' }}>« {chalet.title} »</b> vous attend du <b style={{ color: 'var(--fg-1)' }}>18 au 21 juillet 2026</b>.
        {chalet.host?.name || 'Votre hôte'} vous écrira d'ici quelques heures.
      </p>

      <div style={{
        background: 'var(--snow)', borderRadius: 'var(--radius-lg)',
        padding: 24, marginTop: 12,
        boxShadow: 'var(--shadow-sm)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18,
        maxWidth: 540,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Code de réservation</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--fg-1)', marginTop: 4 }}>KBN-87421</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Total</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--fg-1)', marginTop: 4 }}>{chalet.price * 3 + 85 + 52} $</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button onClick={onHome} style={{
          background: 'var(--char-800)', color: 'var(--snow-warm)',
          border: 'none', borderRadius: 'var(--radius-md)',
          padding: '12px 22px',
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
          cursor: 'pointer',
        }}>Retour à l'accueil</button>
        <button style={{
          background: 'transparent', border: '1px solid var(--char-300)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 22px',
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
          color: 'var(--fg-1)',
          cursor: 'pointer',
        }}>Voir mes voyages</button>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = React.useState('home'); // home | detail | confirm
  const [chalet, setChalet] = React.useState(null);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <Header
        page={page}
        onLogoClick={() => setPage('home')}
      />
      <main>
        {page === 'home' && (
          <Homepage onChaletClick={(c) => { setChalet(c); setPage('detail'); window.scrollTo(0, 0); }} />
        )}
        {page === 'detail' && chalet && (
          <ChaletDetail
            chalet={chalet}
            onBack={() => { setPage('home'); window.scrollTo(0, 0); }}
            onReserve={(c) => { setChalet(c); setPage('confirm'); window.scrollTo(0, 0); }}
          />
        )}
        {page === 'confirm' && chalet && (
          <ConfirmationPage chalet={chalet} onHome={() => { setPage('home'); window.scrollTo(0, 0); }} />
        )}
      </main>
    </div>
  );
}

Object.assign(window, { Footer, Homepage, ConfirmationPage, SectionHeader, App });
