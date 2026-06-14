"use client";

// Last-resort boundary if the root layout itself errors. Must render its
// own <html>/<body> since it replaces the root layout.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "Georgia, serif",
          background: "#faf6f0",
          color: "#2b2520",
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420, padding: 20 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#6b6258", marginBottom: 24 }}>
            Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#2b2520",
              color: "#fffdf9",
              border: 0,
              borderRadius: 12,
              padding: "12px 20px",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
