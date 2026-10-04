import type { ReactNode } from "react";

/** Impaginazione delle pagine di solo testo (privacy, termini): colonna stretta e titoli sobri. */
export function PaginaTesto({ titolo, aggiornata, intro, children }: { titolo: string; aggiornata: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="contenitore py-10">
      <div className="max-w-3xl">
        <h1 className="display text-4xl sm:text-5xl">{titolo}</h1>
        <p className="mt-2 text-sm text-ink-3">Ultimo aggiornamento: {aggiornata}</p>
        <div className="mt-4 text-ink-2">{intro}</div>
        <div className="mt-8 space-y-8">{children}</div>
      </div>
    </div>
  );
}

export function Paragrafo({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{titolo}</h2>
      <div className="mt-2 space-y-3 text-ink-2 [&_a]:text-accent [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>
    </section>
  );
}
