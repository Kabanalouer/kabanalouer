"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/reportClientError";

// Dernier filet : la mise en page racine elle-même a planté (rare). Page
// minimale autonome (pas de Navbar ni de traductions disponibles ici).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif", background: "#ffffff", color: "#222222" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Oups, un problème est survenu</h1>
            <p style={{ color: "#5e5e5e", margin: "0 0 24px" }}>
              On a été prévenus et on s&apos;en occupe. / Something went wrong — we&apos;ve been notified.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ background: "#636e40", color: "#ffffff", border: 0, borderRadius: 9999, padding: "12px 24px", fontWeight: 600, fontSize: 16, cursor: "pointer" }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
