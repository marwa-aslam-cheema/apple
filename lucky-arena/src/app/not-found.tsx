import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card marquee mx-auto max-w-md p-10 text-center">
      <p className="text-6xl" aria-hidden="true">🎰</p>
      <h1 className="gold-text mt-3 text-4xl font-extrabold uppercase">Page not found</h1>
      <p className="mb-6 mt-2 text-muted">This table is closed. The page you are looking for does not exist.</p>
      <Link href="/" className="btn btn-gold">Back to the lobby</Link>
    </div>
  );
}
