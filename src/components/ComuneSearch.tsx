"use client";

import { useId, useMemo, useState } from "react";
import { traccia } from "@/lib/traccia";
import { useRouter } from "next/navigation";
import type { ComuneIndice } from "@/lib/types";

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// L'indice (generato da scripts/build-data.mjs) viene scaricato una sola volta, alla prima interazione.
let indicePromise: Promise<ComuneIndice[]> | null = null;
const caricaIndice = () =>
  (indicePromise ??= fetch("/comuni-index.json")
    .then((r) => r.json() as Promise<ComuneIndice[]>)
    .catch(() => {
      indicePromise = null;
      return [];
    }));

/** Un risultato: il comune e, se l'utente ha scritto una frazione, un quartiere o un CAP, come ci siamo arrivati. */
type Risultato = { c: ComuneIndice; via?: string; chiave: string };

export function ComuneSearch({
  autoFocus = false,
  etichetta = "Il tuo comune, una frazione o il CAP",
  sezione,
}: {
  autoFocus?: boolean;
  etichetta?: string;
  /** Sezione della scheda del comune da aprire (es. "documento"). */
  sezione?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const [comuni, setComuni] = useState<ComuneIndice[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const prepara = () => {
    if (comuni.length === 0) caricaIndice().then(setComuni);
  };

  const indexed = useMemo(
    () => comuni.map((c) => ({ c, key: norm(c.nome), alt: (c.alt ?? []).map((a) => ({ nome: a, key: norm(a) })) })),
    [comuni],
  );

  const results = useMemo((): Risultato[] => {
    const q = norm(query);
    if (!q) return [];
    // CAP: 5 cifre (o l'inizio di un CAP)
    if (/^\d{2,5}$/.test(q)) {
      return indexed
        .filter((x) => x.c.cap?.some((cap) => cap.startsWith(q)))
        .slice(0, 8)
        .map((x) => ({ c: x.c, chiave: x.c.istat, via: `CAP ${x.c.cap!.find((cap) => cap.startsWith(q))}` }));
    }
    const inizio = indexed.filter((x) => x.key.startsWith(q)).map((x) => ({ c: x.c, chiave: x.c.istat }));
    const contiene = indexed.filter((x) => !x.key.startsWith(q) && x.key.includes(q)).map((x) => ({ c: x.c, chiave: x.c.istat }));
    // Frazioni, località e quartieri: "Licola" → Pozzuoli, "Vomero" → Napoli
    const frazioni: Risultato[] = [];
    for (const x of indexed)
      for (const a of x.alt)
        if (a.key.startsWith(q) || (q.length > 3 && a.key.includes(q))) frazioni.push({ c: x.c, chiave: `${x.c.istat}-${a.key}`, via: a.nome });
    return [...inizio, ...contiene, ...frazioni.slice(0, 6)].slice(0, 8);
  }, [indexed, query]);

  const go = (c: ComuneIndice) => {
    traccia("cerca-comune", { comune: c.nome });
    router.push(`/comune/${c.istat}/${sezione ? `#${sezione}` : ""}`);
  };

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="mb-2 block px-1 text-base font-semibold text-ink-2">
        {etichetta}
      </label>
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={results[active] ? `${listId}-${results[active].chiave}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="Es. Pozzuoli, Licola, Vomero o 80078"
        value={query}
        onChange={(e) => {
          prepara();
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => {
          prepara();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            go(results[active].c);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className="min-h-14 w-full rounded-2xl border-2 border-line bg-bg px-5 py-4 text-xl outline-none placeholder:text-ink-3 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15"
      />
      {open && query && (
        <ul id={listId} role="listbox" className="absolute z-40 mt-2 max-h-96 w-full overflow-auto rounded-2xl border border-line bg-surface py-1.5 text-left shadow-xl">
          {results.length === 0 && (
            <li className="px-5 py-4 text-ink-2">
              {comuni.length === 0 ? "Caricamento…" : "Nessun comune, frazione o CAP trovato. Controlla come è scritto."}
            </li>
          )}
          {results.map((r, i) => (
            <li
              key={r.chiave}
              id={`${listId}-${r.chiave}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(r.c);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-14 cursor-pointer items-center justify-between gap-3 px-5 py-2.5 ${i === active ? "bg-accent-soft" : ""}`}
            >
              <span>
                {r.via ? (
                  <>
                    <span className="block text-lg font-semibold">{r.via}</span>
                    <span className="block text-sm text-ink-2">
                      {r.via.startsWith("CAP") ? "" : "si trova nel comune di "}
                      <strong>{r.c.nome}</strong>
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-semibold">{r.c.nome}</span>
                )}
              </span>
              <span className="shrink-0 text-sm text-ink-3">Prov. di {r.c.provincia}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
