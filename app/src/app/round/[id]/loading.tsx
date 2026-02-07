export default function RoundLoading() {
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="h-8 w-32 animate-pulse rounded bg-bg-tertiary" />
      <div className="h-40 animate-pulse rounded-2xl border border-border bg-bg-secondary" />
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-bg-secondary" />
    </main>
  );
}
