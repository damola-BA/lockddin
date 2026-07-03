// Layout-preserving skeleton primitives for the provider screens' loading
// states — muted bars that mirror each screen's card/row shape (never spinners).
export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl border border-line bg-surface-2 ${className}`} />;
}

// A page title + subtitle stand-in shared by most screens.
export function SkeletonHeader() {
  return (
    <div className="mb-6">
      <SkeletonBar className="h-7 w-48" />
      <SkeletonBar className="mt-2.5 h-3.5 w-64" />
    </div>
  );
}
