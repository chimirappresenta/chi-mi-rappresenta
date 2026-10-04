"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { dataLunga } from "@/lib/format";
import { assegnaSeggi, CX, CY, H, R_DOT, W } from "@/lib/emiciclo";
import { ScriviA } from "./ScriviA";
import { Condividi } from "./Condividi";
import type { Atto, Attivita, ConsigliereRegionale, GruppoConsiliare, Persona, TipoAtto } from "@/lib/types";

export type ConsigliereEmiciclo = ConsigliereRegionale & {
  slug?: string;
  attivita?: Attivita;
  ultimiAtti: Pick<Atto, "id" | "tipo" | "data" | "titolo" | "url">[];
};

type Props = {
  consiglieri: ConsigliereEmiciclo[];
  presidente?: (Persona & { gruppo?: string }) | null;
  gruppi: GruppoConsiliare[];
  tipi: TipoAtto[];
  /** Se indicata, il grafico parte mostrando solo gli eletti in questa circoscrizione (pagina del comune). */
  circoscrizione?: string;
  /** Comune dell'utente (pagina del comune): precompila il messaggio al consigliere. */
  comune?: string;
};

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function Emiciclo({ consiglieri, presidente, gruppi, tipi, circoscrizione, comune }: Props) {
  const [q, setQ] = useState("");
  const [gruppiAttivi, setGruppiAttivi] = useState<Set<string>>(new Set());
  const [soloCirc, setSoloCirc] = useState(Boolean(circoscrizione));
  const [aperto, setAperto] = useState<ConsigliereEmiciclo | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const colore = useMemo(() => new Map(gruppi.map((g) => [g.nome, g.colore])), [gruppi]);
  const gruppo = useMemo(() => new Map(gruppi.map((g) => [g.nome, g])), [gruppi]);

  const seggi = useMemo(() => assegnaSeggi(consiglieri, gruppi), [consiglieri, gruppi]);

  const nq = norm(q.trim());
  const corrisponde = (c: ConsigliereEmiciclo) =>
    (!nq || norm(c.nome).includes(nq) || norm(c.gruppo ?? "").includes(nq) || norm(gruppo.get(c.gruppo ?? "")?.sigla ?? "").includes(nq)) &&
    (gruppiAttivi.size === 0 || gruppiAttivi.has(c.gruppo ?? "")) &&
    (!soloCirc || c.circoscrizione === circoscrizione);
  const filtrati = seggi.filter((s) => corrisponde(s.c));
  const filtroAttivo = Boolean(nq) || gruppiAttivi.size > 0 || soloCirc;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (aperto && !d.open) d.showModal();
    if (!aperto && d.open) d.close();
  }, [aperto]);

  const toggleGruppo = (nome: string) =>
    setGruppiAttivi((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });

  const conteggioGruppo = (nome: string) => consiglieri.filter((c) => c.gruppo === nome).length;
  const maggioranza = consiglieri.filter((c) => gruppo.get(c.gruppo ?? "")?.coalizione === "maggioranza").length;
  const hovered = seggi.find((s) => s.c.username === hover);

  return (
    <div>
      {/* Ricerca e filtri */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="sr-only">Cerca un consigliere per nome o gruppo</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per nome o gruppo (es. Sangiuliano, PD, Forza Italia)"
            className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 outline-none placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>
        {circoscrizione && (
          <button
            type="button"
            aria-pressed={soloCirc}
            onClick={() => setSoloCirc((v) => !v)}
            className={`rounded-xl border px-3 py-2.5 text-sm whitespace-nowrap ${
              soloCirc ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink-2"
            }`}
          >
            {soloCirc ? "✓ " : ""}Solo eletti in provincia di {circoscrizione}
          </button>
        )}
      </div>

      {/* Emiciclo */}
      <div className="relative mx-auto mt-4 max-w-3xl">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="Emiciclo del Consiglio regionale">
          {seggi.map(({ c, x, y }) => {
            const attivo = corrisponde(c);
            const selezionato = aperto?.username === c.username;
            return (
              <circle
                key={c.username}
                cx={x}
                cy={y}
                r={R_DOT}
                fill={colore.get(c.gruppo ?? "") ?? "var(--ink-3)"}
                opacity={attivo ? 1 : 0.15}
                stroke={selezionato || hover === c.username ? "var(--ink)" : "var(--surface)"}
                strokeWidth={selezionato || hover === c.username ? 2.5 : 1.2}
                tabIndex={attivo ? 0 : -1}
                role="button"
                aria-label={`${c.nome}, ${gruppo.get(c.gruppo ?? "")?.sigla ?? c.gruppo ?? ""}`}
                className="cursor-pointer outline-none transition-opacity focus-visible:stroke-[var(--ink)]"
                onClick={() => setAperto(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setAperto(c);
                  }
                }}
                onMouseEnter={() => setHover(c.username)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(c.username)}
                onBlur={() => setHover(null)}
              />
            );
          })}
          {presidente && (
            <g aria-label={`${presidente.nome}, presidente della Regione`}>
              <circle cx={CX} cy={CY - 18} r={R_DOT + 3} fill={colore.get(presidente.gruppo ?? "") ?? "var(--ink-3)"} stroke="var(--ink)" strokeWidth={1.5} />
              <text x={CX} y={CY + 2} textAnchor="middle" fontSize="9" fill="var(--ink-2)">
                Presidente
              </text>
            </g>
          )}
          <text x={CX} y={CY - 52} textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--ink)">
            {consiglieri.length}
          </text>
          <text x={CX} y={CY - 38} textAnchor="middle" fontSize="8.5" fill="var(--ink-3)">
            consiglieri · {maggioranza} di maggioranza
          </text>
        </svg>
        {/* Etichetta al passaggio del mouse */}
        {hovered && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-2 py-1 text-xs whitespace-nowrap text-bg shadow"
            style={{ left: `${(hovered.x / W) * 100}%`, top: `calc(${(hovered.y / H) * 100}% - 12px)` }}
          >
            {hovered.c.nome} · {gruppo.get(hovered.c.gruppo ?? "")?.sigla}
          </div>
        )}
      </div>

      {/* Legenda = filtro per gruppo */}
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtra per gruppo">
        {gruppi.map((g) => {
          const on = gruppiAttivi.has(g.nome);
          return (
            <button
              key={g.nome}
              type="button"
              aria-pressed={on}
              title={g.nome}
              onClick={() => toggleGruppo(g.nome)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                on ? "border-ink bg-surface-2 font-semibold text-ink" : "border-line bg-surface text-ink-2 hover:border-ink-3"
              }`}
            >
              <span className="inline-block size-2.5 rounded-full" style={{ background: g.colore }} aria-hidden />
              {g.sigla} <span className="text-ink-3">{conteggioGruppo(g.nome)}</span>
            </button>
          );
        })}
        {filtroAttivo && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setGruppiAttivi(new Set());
              setSoloCirc(false);
            }}
            className="rounded-full px-2.5 py-1 text-xs text-accent hover:underline"
          >
            Azzera filtri
          </button>
        )}
      </div>

      {/* Risultati compatti: solo quando c'è un filtro, così niente scroll infinito */}
      {filtroAttivo && (
        <div className="mt-4">
          <p className="text-sm text-ink-3" aria-live="polite">
            {filtrati.length === 0 ? "Nessun consigliere trovato." : `${filtrati.length} consiglieri`}
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {filtrati.map(({ c }) => (
              <li key={c.username}>
                <button
                  type="button"
                  onClick={() => setAperto(c)}
                  className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm hover:border-ink-3"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: colore.get(c.gruppo ?? "") }} aria-hidden />
                  <span className="truncate font-medium">{c.nome}</span>
                  <span className="ml-auto shrink-0 text-xs text-ink-3">{gruppo.get(c.gruppo ?? "")?.sigla}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!filtroAttivo && <p className="mt-3 text-sm text-ink-3">Tocca un punto per aprire la scheda del consigliere.</p>}

      {/* Scheda del consigliere */}
      <dialog
        ref={dialogRef}
        onClose={() => setAperto(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setAperto(null); // clic sullo sfondo
        }}
        className="m-0 mt-auto max-h-[85vh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40 sm:mt-0 sm:mr-0 sm:ml-auto sm:h-full sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-2xl"
      >
        {aperto && <SchedaConsigliere c={aperto} g={gruppo.get(aperto.gruppo ?? "")} tipi={tipi} comune={comune} onClose={() => setAperto(null)} />}
      </dialog>
    </div>
  );
}

function SchedaConsigliere({
  c,
  g,
  tipi,
  comune,
  onClose,
}: {
  c: ConsigliereEmiciclo;
  g?: GruppoConsiliare;
  tipi: TipoAtto[];
  comune?: string;
  onClose: () => void;
}) {
  const nomeTipo = (id: string) => tipi.find((t) => t.id === id)?.nome ?? id;
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-2 uppercase">
            <span className="inline-block size-2.5 rounded-full" style={{ background: g?.colore }} aria-hidden />
            {g?.sigla ?? c.gruppo}
            {c.ruoloGruppo && <span className="font-normal text-ink-3 normal-case">· {c.ruoloGruppo}</span>}
          </p>
          <h2 className="display mt-1 text-3xl">{c.nome}</h2>
          <p className="text-sm text-ink-2">
            Consigliere regionale ·{" "}
            {c.circoscrizione ? `eletto in provincia di ${c.circoscrizione}` : "subentrato dopo le elezioni"}
          </p>
          {g && <p className="mt-0.5 text-xs text-ink-3">{g.nome} · {g.coalizione}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi la scheda"
          className="-mt-1 -mr-1 rounded-full p-2 text-lg leading-none text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          ×
        </button>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        {c.email && (
          <a href={`mailto:${c.email}`} className="block break-all text-accent hover:underline">
            {c.email}
          </a>
        )}
        {c.pec && (
          <a href={`mailto:${c.pec}`} className="block break-all text-accent hover:underline">
            PEC {c.pec}
          </a>
        )}
        {c.tel && (
          <a href={`tel:${c.tel.replace(/[^\d+]/g, "").slice(0, 13)}`} className="block text-accent hover:underline">
            Tel. {c.tel}
          </a>
        )}
      </div>

      {c.commissioni && c.commissioni.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Commissioni</h3>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {c.commissioni.map((m) => (
              <li key={m} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-ink-2">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line p-3">
          <p className="text-xs text-ink-3">Atti presentati</p>
          <p className="display text-3xl tabular-nums">{c.attivita?.primoFirmatario ?? 0}</p>
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="text-xs text-ink-3">Firmati in totale</p>
          <p className="display text-3xl tabular-nums">{c.attivita?.totale ?? 0}</p>
        </div>
      </div>

      {c.ultimiAtti.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Ultimi atti</h3>
          <ul className="mt-1 divide-y divide-line">
            {c.ultimiAtti.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                <p className="text-xs text-ink-3">
                  {nomeTipo(a.tipo)} · {dataLunga(a.data)}
                </p>
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
                    {a.titolo}
                  </a>
                ) : (
                  a.titolo
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <ScriviA nome={c.nome} tipo="consigliere-regionale" email={c.email} pec={c.pec} comune={comune} />
      </div>
      {c.slug && (
        <div className="mt-3">
          <Condividi
            compatto
            path={`/regione/campania/consiglieri/${c.slug}/`}
            titolo={`${c.nome}, consigliere regionale`}
            testo={`${c.nome}, consigliere regionale della Campania${g ? ` (${g.sigla})` : ""}: contatti e atti presentati in Consiglio regionale.`}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {c.slug && (
          <Link
            href={`/regione/campania/consiglieri/${c.slug}/`}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90"
          >
            Tutti gli atti e la scheda completa →
          </Link>
        )}
        {c.url && (
          <a href={c.url} target="_blank" rel="noreferrer" className="rounded-xl border border-line px-4 py-2 text-sm text-ink-2 hover:border-ink-3">
            Scheda ufficiale ↗
          </a>
        )}
      </div>
    </div>
  );
}
