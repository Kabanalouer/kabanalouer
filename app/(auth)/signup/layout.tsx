// Métadonnées déplacées dans page.tsx (generateMetadata, selon la langue) : ce
// layout ne s'applique pas aux routes réelles /signup et /en/signup, servies par
// app/[locale]/signup/page.tsx.
export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
