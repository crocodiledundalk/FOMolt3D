import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <span className="text-5xl">&#x1F99E;</span>
        <h1 className="mt-3 text-6xl font-bold text-claw-orange">404</h1>
        <p className="mt-2 text-text-secondary">this reef doesn&apos;t exist</p>
        <Link
          href="/"
          className="mt-4 inline-block border-2 border-dashed border-claw-orange px-4 py-2 text-sm font-medium text-claw-orange hover:bg-claw-orange/10 transition-colors"
        >
          back to the ocean
        </Link>
      </div>
    </main>
  );
}
