// Friendly 404 for unknown URLs (mistyped booking links, stale routes).
export default function NotFound() {
  return (
    <div className="min-h-dvh bg-[#faf6f0] text-stone-800">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 text-center">
        <h1 className="mb-2 font-serif text-2xl text-stone-900">Page not found</h1>
        <p className="text-sm text-stone-600">
          This link doesn&apos;t lead anywhere. Check the address and try again.
        </p>
      </main>
    </div>
  );
}
