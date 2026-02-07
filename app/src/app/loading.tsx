export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="animate-lobster-spin text-4xl">&#x1F99E;</span>
        <p className="text-sm text-text-muted">crawling to the reef...</p>
      </div>
    </main>
  );
}
