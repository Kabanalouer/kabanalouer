// Métadonnées déplacées dans page.tsx (generateMetadata, selon la langue) : ce
// layout ne s'applique pas aux routes réelles /login et /en/login, servies par
// app/[locale]/login/page.tsx.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
