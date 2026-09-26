export default function PawIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 13.5c-2.6 0-5 2.6-5 4.9 0 1.4 1 2.1 2.2 2.1.9 0 1.7-.5 2.8-.5s1.9.5 2.8.5c1.2 0 2.2-.7 2.2-2.1 0-2.3-2.4-4.9-5-4.9z" />
      <ellipse cx="8.5" cy="7" rx="1.6" ry="2.2" />
      <ellipse cx="15.5" cy="7" rx="1.6" ry="2.2" />
      <ellipse cx="4.8" cy="11.3" rx="1.5" ry="1.9" />
      <ellipse cx="19.2" cy="11.3" rx="1.5" ry="1.9" />
    </svg>
  );
}
