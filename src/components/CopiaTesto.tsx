"use client";

import { useState } from "react";

/** Pulsante "Copia" per indirizzi e testi lunghi da scrivere a mano (es. la PEC del Comune). */
export function CopiaTesto({ testo, etichetta = "Copia", evento }: { testo: string; etichetta?: string; evento?: string }) {
  const [fatto, setFatto] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(testo);
          setFatto(true);
          setTimeout(() => setFatto(false), 2000);
        } catch {
          window.prompt("Copia il testo:", testo);
        }
      }}
      data-umami-event={evento}
      className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink-2 hover:border-ink-3"
      aria-live="polite"
    >
      {fatto ? "✓ Copiato" : etichetta}
    </button>
  );
}
