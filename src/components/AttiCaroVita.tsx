"use client";

import Link from "next/link";
import { useState } from "react";
import { slugConsigliere } from "@/lib/format";
import type { Atto, TipoAtto } from "@/lib/types";

export const ICONE_TEMI: Record<string, string> = {
  bollette: "⛽",
  trasporti: "🚌",
  agricoltura: "🌾",
  casa: "🏠",
  redditi: "💶",
};

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const dataBreve = (iso: string) => `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** Esito in un colpo d'occhio: verde approvato, rosso respinto, grigio quando il Consiglio non lo indica. */
const ESITO: Record<string, { txt: string; cls: string }> = {
  approvata: { txt: "Approvata", cls: "bg-accent-soft text-accent" },
  "non-approvata": { txt: "Respinta", cls: "bg-warn-soft text-warn" },
  respinta: { txt: "Respinta", cls: "bg-warn-soft text-warn" },
  ritirata: { txt: "Ritirata", cls: "bg-surface-2 text-ink-3" },
  decaduta: { txt: "Decaduta", cls: "bg-surface-2 text-ink-3" },
};
const NON_INDICATO = {
  txt: "Esito non indicato",
  cls: "bg-surface-2 text-ink-3",
};

export type TemaAtto = { id: string; nome: string; breve: string };

function Scheda({ atto, tipi, regione, tema }: { atto: Atto; tipi: TipoAtto[]; regione: string; tema?: TemaAtto }) {
  const tipo = tipi.find((t) => t.id === atto.tipo)?.nome ?? atto.tipo;
  const esito = (atto.esito && ESITO[atto.esito]) || NON_INDICATO;
  const [primo, ...altri] = atto.firmatari;
  return (
    <li className="flex flex-col rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-xs text-ink-3">
        <span className="font-semibold tracking-wide text-ink-2 uppercase">{tipo}</span>
        <time dateTime={atto.data}>{dataBreve(atto.data)}</time>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 font-semibold whitespace-nowrap ${esito.cls}`}>{esito.txt}</span>
      </p>
      <p className="mt-1.5 line-clamp-3">
        {atto.url ? (
          <a href={atto.url} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
            {atto.titolo}
          </a>
        ) : (
          atto.titolo
        )}
      </p>
      <p className="mt-auto flex items-end justify-between gap-3 pt-2 text-xs text-ink-3">
        {tema && (
          <span className="shrink-0">
            <span aria-hidden>{ICONE_TEMI[tema.id]}</span> {tema.breve}
          </span>
        )}
        {primo && (
          <span className="text-right">
            {primo.username ? (
              <Link
                href={`/regione/${regione}/consiglieri/${slugConsigliere(primo.username)}/`}
                className="text-ink-2 hover:text-accent hover:underline"
              >
                {primo.nome}
              </Link>
            ) : (
              primo.nome
            )}
            {altri.length > 0 && (altri.length === 1 ? " e un altro" : ` e altri ${altri.length}`)}
          </span>
        )}
      </p>
    </li>
  );
}

/**
 * Atti dello speciale in un solo elenco: i temi sono filtri (non sezioni ripetute), prima gli atti recenti.
 * `temaDi`: id dell'atto → id del tema; `recentiDal`: data (AAAA-MM-GG) da cui un atto conta come recente.
 */
export function AttiCaroVita({
  atti,
  temaDi,
  temi,
  tipi,
  regione,
  recentiDal,
}: {
  atti: Atto[];
  temaDi: Record<string, string>;
  temi: TemaAtto[];
  tipi: TipoAtto[];
  regione: string;
  recentiDal: string;
}) {
  const [filtro, setFiltro] = useState<string | null>(null);
  const conteggio = (id: string) => atti.filter((a) => temaDi[a.id] === id).length;
  const visibili = atti.filter((a) => !filtro || temaDi[a.id] === filtro);
  const recenti = visibili.filter((a) => a.data >= recentiDal);
  const precedenti = visibili.filter((a) => a.data < recentiDal);
  const temaPer = (a: Atto) => temi.find((t) => t.id === temaDi[a.id]);
  const scheda = (a: Atto) => <Scheda key={a.id} atto={a} tipi={tipi} regione={regione} tema={temaPer(a)} />;
  const bottone = (id: string | null, etichetta: string, n: number) => (
    <button
      key={id ?? "tutti"}
      type="button"
      aria-pressed={filtro === id}
      onClick={() => setFiltro(id)}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
        filtro === id ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
      }`}
    >
      {etichetta} <span className="opacity-60">{n}</span>
    </button>
  );

  return (
    <div>
      <div role="group" aria-label="Filtra per tema" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {bottone(null, "Tutti", atti.length)}
        {temi.filter((t) => conteggio(t.id) > 0).map((t) => bottone(t.id, `${ICONE_TEMI[t.id] ?? ""} ${t.breve}`, conteggio(t.id)))}
      </div>
      {recenti.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-semibold tracking-wider text-ink-3 uppercase">Ultimi tre mesi</h3>
          <ul className="mt-2 grid gap-3 md:grid-cols-2">{recenti.map(scheda)}</ul>
        </>
      )}
      {precedenti.length > 0 &&
        (recenti.length > 0 ? (
          <details className="group mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-accent hover:underline">Atti precedenti ({precedenti.length})</summary>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">{precedenti.map(scheda)}</ul>
          </details>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">{precedenti.map(scheda)}</ul>
        ))}
    </div>
  );
}
