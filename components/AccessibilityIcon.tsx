export default function AccessibilityIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <circle cx="11" cy="4" r="1.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 7.5v6h5l2.5 5.5M11 10.5h4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 11.2a5 5 0 105.9 7.3" />
    </svg>
  );
}
