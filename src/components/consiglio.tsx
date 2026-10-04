import Link from "next/link";
import { dataLunga, slugConsigliere } from "@/lib/format";
import type { Atto, Legge, TipoAtto } from "@/lib/types";

const ESITI: Record<NonNullable<Atto["esito"]>, { label: string; cls: string }> = {
  approvata: { label: "Approvata", cls: "bg-accent-soft text-accent" },
  "non-approvata": { label: "Non approvata", cls: "bg-warn-soft text-warn" },
  respinta: { label: "Respinta", cls: "bg-warn-soft text-warn" },
  ritirata: { label: "Ritirata", cls: "bg-surface-2 text-ink-3" },
  decaduta: { label: "Decaduta", cls: "bg-surface-2 text-ink-3" },
};

/** Spiegazione breve di ogni tipo di atto, per chi non conosce il regolamento del Consiglio. */
export const SPIEGAZIONE_TIPI: Record<string, string> = {
  pdl: "Testo di una nuova legge regionale proposto da uno o più consiglieri (o dalla Giunta, dai Comuni, dai cittadini).",
  interrogazione: "Domanda scritta alla Giunta su un problema concreto: la Giunta deve rispondere.",
  "question-time": "Domanda breve con risposta immediata in Aula da parte della Giunta.",
  mozione: "Proposta che impegna la Giunta a fare qualcosa: viene votata dal Consiglio.",
  risoluzione: "Presa di posizione del Consiglio su un tema, votata in Aula o in commissione.",
};

export function EsitoBadge({ atto }: { atto: Atto }) {
  if (!atto.esito) return null;
  const e = ESITI[atto.esito];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.cls}`}>
      {e.label}
      {atto.esitoData && ` · ${atto.esitoData}`}
    </span>
  );
}

export function AttoRow({ atto, tipi, mostraFirmatari = true }: { atto: Atto; tipi: TipoAtto[]; mostraFirmatari?: boolean }) {
  const tipo = tipi.find((t) => t.id === atto.tipo)?.nome ?? atto.tipo;
  const [primo, ...altri] = atto.firmatari;
  return (
    <div className="px-4 py-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
        <span className="font-semibold tracking-wide text-ink-2 uppercase">{tipo}</span>
        <span>n. {atto.numero}</span>
        <span>·</span>
        <time dateTime={atto.data}>{dataLunga(atto.data)}</time>
        <EsitoBadge atto={atto} />
      </p>
      <p className="mt-1">
        {atto.url ? (
          <a href={atto.url} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
            {atto.titolo}
          </a>
        ) : (
          atto.titolo
        )}
      </p>
      {mostraFirmatari && primo && (
        <p className="mt-1 text-sm text-ink-3">
          {primo.username ? (
            <Link href={`/regione/campania/consiglieri/${slugConsigliere(primo.username)}/`} className="text-ink-2 hover:text-accent hover:underline">
              {primo.nome}
            </Link>
          ) : (
            primo.nome
          )}
          {altri.length > 0 && ` e altri ${altri.length}`}
        </p>
      )}
      {atto.commissione && <p className="mt-0.5 text-xs text-ink-3">Commissione: {atto.commissione}</p>}
    </div>
  );
}

export function LeggeCard({ legge }: { legge: Legge }) {
  const titolo = legge.oggetto ?? legge.intestazione;
  return (
    <article className="flex h-full flex-col p-4 sm:p-5">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-accent">Legge n. {legge.numero}</span>
        <time dateTime={legge.data}>{dataLunga(legge.data)}</time>
      </p>
      {legge.riassunto ? (
        <>
          {/* In primo piano la spiegazione semplice; il titolo ufficiale resta sotto, più piccolo */}
          <p className="mt-3 text-base leading-snug">{legge.riassunto.testo}</p>
          <p className="mt-3 text-sm text-ink-3">
            <span className="font-medium text-ink-2">Titolo ufficiale:</span> {titolo}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-ink-3">
            ✦ Riassunto generato con l&apos;AI dal testo ufficiale: fa fede la legge
          </p>
        </>
      ) : (
        <h3 className="mt-3 text-base font-medium">{titolo}</h3>
      )}
      <p className="mt-auto flex flex-wrap gap-2 pt-4 text-sm">
        {legge.pdf && (
          <a href={legge.pdf} className="rounded-full bg-ink px-3 py-1.5 font-medium text-bg hover:opacity-90">
            Testo della legge ↓
          </a>
        )}
        {legge.relazione && (
          <a href={legge.relazione} className="rounded-full border border-line px-3 py-1.5 text-ink-2 hover:border-ink-3">
            Relazione illustrativa ↓
          </a>
        )}
        <a href={legge.url} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1.5 text-ink-2 hover:border-ink-3">
          Scheda ufficiale ↗
        </a>
      </p>
    </article>
  );
}
