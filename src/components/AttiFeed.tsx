"use client";

import { useMemo, useState } from "react";
import type { Atto, TipoAtto } from "@/lib/types";
import { AttoRow } from "./consiglio";

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const PAGINA = 30;

export function AttiFeed({ atti, tipi }: { atti: Atto[]; tipi: TipoAtto[] }) {
  const [tipo, setTipo] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [mostrati, setMostrati] = useState(PAGINA);

  const filtrati = useMemo(() => {
    const nq = norm(q.trim());
    return atti.filter(
      (a) =>
        (!tipo || a.tipo === tipo) &&
        (!nq || norm(a.titolo).includes(nq) || a.firmatari.some((f) => norm(f.nome).includes(nq))),
    );
  }, [atti, tipo, q]);

  const conteggio = (id: string | null) => atti.filter((a) => !id || a.tipo === id).length;

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo di atto">
        {[{ id: null, plurale: "Tutti" }, ...tipi].map((t) => (
          <button
            key={t.id ?? "tutti"}
            type="button"
            aria-pressed={tipo === t.id}
            onClick={() => {
              setTipo(t.id);
              setMostrati(PAGINA);
            }}
            className={`rounded-full border px-3 py-1 text-sm ${
              tipo === t.id ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-ink-2 hover:border-ink-3"
            }`}
          >
            {t.plurale} <span className="opacity-70">{conteggio(t.id)}</span>
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="sr-only">Cerca negli atti</span>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setMostrati(PAGINA);
          }}
          placeholder="Cerca per parola (es. ospedale, rifiuti, Sarno) o per consigliere"
          className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 outline-none placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </label>
      <p className="mt-3 text-sm text-ink-3" aria-live="polite">
        {filtrati.length} atti
      </p>
      <div className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
        {filtrati.slice(0, mostrati).map((a) => (
          <AttoRow key={a.id} atto={a} tipi={tipi} />
        ))}
        {filtrati.length === 0 && <p className="px-4 py-6 text-center text-ink-3">Nessun atto trovato.</p>}
      </div>
      {filtrati.length > mostrati && (
        <button
          type="button"
          onClick={() => setMostrati((m) => m + PAGINA)}
          className="mt-3 w-full rounded-2xl border border-line bg-surface py-2.5 text-sm font-medium text-ink-2 hover:border-ink-3"
        >
          Mostra altri ({filtrati.length - mostrati})
        </button>
      )}
    </div>
  );
}
