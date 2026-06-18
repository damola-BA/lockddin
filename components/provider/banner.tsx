import { storageUrl } from "@/lib/storage-url";

// Auto-generated banner — shown when the provider hasn't uploaded their own.
// Uses their name + city; pure CSS, no external service.
function AutoBanner({
  name,
  city,
}: {
  name: string;
  city?: string | null;
}) {
  return (
    <div
      className="relative flex h-40 w-full items-end overflow-hidden rounded-2xl"
      style={{
        background:
          "linear-gradient(135deg, #bb431b 0%, #8b3214 45%, #3d1a0a 100%)",
      }}
    >
      {/* decorative circles */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-15"
        style={{ background: "#fff" }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full opacity-10"
        style={{ background: "#fff" }}
      />
      <div className="relative z-10 px-5 pb-5">
        <p className="font-serif text-2xl leading-tight text-white">{name}</p>
        {city && (
          <p className="mt-0.5 text-sm text-white/70">{city}</p>
        )}
      </div>
    </div>
  );
}

// Shown on the public booking page. Renders uploaded photo if available,
// otherwise the auto-generated CSS banner.
export function ProviderBanner({
  name,
  city,
  bannerPath,
}: {
  name: string;
  city?: string | null;
  bannerPath?: string | null;
}) {
  if (bannerPath) {
    return (
      <div className="relative h-40 w-full overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={storageUrl(bannerPath)}
          alt={name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 px-5 pb-5">
          <p className="font-serif text-2xl leading-tight text-white">{name}</p>
          {city && <p className="mt-0.5 text-sm text-white/70">{city}</p>}
        </div>
      </div>
    );
  }

  return <AutoBanner name={name} city={city} />;
}
