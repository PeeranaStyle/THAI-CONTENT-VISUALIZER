export default function WorkspaceLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="mx-auto max-w-[1120px]">
      <span className="sr-only">Loading page content</span>
      <div className="h-3 w-28 animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="mt-3 h-8 w-64 max-w-full animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-[20px] border border-[var(--line)] bg-[var(--surface)]" />
        ))}
      </div>
    </div>
  );
}
