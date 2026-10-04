"use client";

import { useState, type ReactNode } from "react";

/** Schede a linguette: un'elezione alla volta, per non allungare troppo la pagina. */
export function SchedeElezioni({ etichette, children }: { etichette: string[]; children: ReactNode[] }) {
  const [attiva, setAttiva] = useState(0);
  return (
    <div>
      <div role="tablist" aria-label="Elezioni" className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {etichette.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-elezione-${i}`}
            aria-selected={i === attiva}
            aria-controls={`pannello-elezione-${i}`}
            onClick={() => setAttiva(i)}
            className={`min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap ${
              i === attiva ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {children.map((c, i) => (
        <div key={etichette[i]} role="tabpanel" id={`pannello-elezione-${i}`} aria-labelledby={`tab-elezione-${i}`} hidden={i !== attiva} className="mt-4">
          {c}
        </div>
      ))}
    </div>
  );
}
