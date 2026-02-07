"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <span className="text-5xl">&#x1F980;</span>
        <h1 className="mt-3 text-2xl font-bold text-claw-red">the claw machine broke</h1>
        <p className="mt-2 text-text-secondary">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 border-2 border-dashed border-claw-orange px-4 py-2 text-sm font-medium text-claw-orange hover:bg-claw-orange/10 transition-colors"
        >
          try again, crab
        </button>
      </div>
    </main>
  );
}
