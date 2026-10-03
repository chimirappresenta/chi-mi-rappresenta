import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { Fonte, Persona } from "@/lib/types";
import { ILLUSTRAZIONE } from "./Illustrazioni";
import { SegnalaErrore } from "./SegnalaErrore";

export type LivelloId = "comune" | "regione" | "parlamento" | "europa";

const NOME_LIVELLO: Record<LivelloId, string> = {
  comune: "Comune",
  regione: "Regione",
  parlamento: "Parlamento",
  europa: "Europa",
};

/** Variabili CSS del livello: i componenti interni (avatar, etichette) le ereditano. */
export const stileLivello = (id: LivelloId) =>
  ({ "--lv": `var(--lv-${id})`, "--lv-bg": `var(--lv-${id}-bg)` }) as CSSProperties;

/** Grande riquadro colorato di un livello istituzionale, con illustrazione e pannello bianco per i contenuti. */
export function Livello({
  id,
  numero,
  titolo,
  sottotitolo,
  fonti,
  children,
  anchor = id,
}: {
  id: LivelloId;
  /** id HTML della sezione, se diverso dal livello (es. più sezioni dello stesso livello in una pagina). */
  anchor?: string;
  numero: number;
  titolo: string;
  sottotitolo: ReactNode;
  fonti: Fonte[];
  children: ReactNode;
}) {
  const Illustrazione = ILLUSTRAZIONE[id];
  return (
    <section id={anchor} style={stileLivello(id)} className="puntini scroll-mt-24 rounded-[32px] bg-[var(--lv-bg)] p-2 sm:p-3">
      <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-5 sm:px-5">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--lv)] uppercase">
            Livello {numero} · {NOME_LIVELLO[id]}
          </p>
          <h2 className="display mt-3 text-4xl sm:text-5xl">{titolo}</h2>
          <p className="mt-2 max-w-xl text-ink-2">{sottotitolo}</p>
        </div>
        <Illustrazione className="hidden w-32 shrink-0 sm:block lg:w-40" />
      </div>
      <div className="space-y-6 rounded-[26px] bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">{children}</div>
      <div className="flex flex-col gap-3 px-3 pt-3 pb-1 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <FontiNote fonti={fonti} />
        <SegnalaErrore sezione={titolo} />
      </div>
    </section>
  );
}

/** Data leggibile della fonte: quella dichiarata dalla fonte, altrimenti quella in cui l'abbiamo scaricata. */
const dataFonte = (f: Fonte) => f.aggiornato ?? (f.raccolto ? f.raccolto.split("-").reverse().join("/") : undefined);

export function FontiNote({ fonti }: { fonti: Fonte[] }) {
  return (
    <p className="text-sm text-ink-2">
      <span className="font-semibold">Dati aggiornati: </span>
      {fonti.map((f, i) => {
        const data = dataFonte(f);
        return (
          <span key={f.id}>
            {i > 0 && " · "}
            <a href={f.url} target="_blank" rel="noreferrer" className="underline decoration-ink-3/40 underline-offset-2 hover:text-ink">
              {/* se due fonti sono dello stesso ente, si distinguono per nome */}
              {fonti.filter((x) => x.ente === f.ente).length > 1 ? `${f.ente} – ${f.nome.toLowerCase()}` : f.ente}
            </a>
            {data && <> al {data}</>}
          </span>
        );
      })}
    </p>
  );
}

export function Gruppo({ titolo, nota, children }: { titolo: string; nota?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wider text-ink-3 uppercase">{titolo}</h3>
      {nota && <p className="mt-1 text-sm text-ink-3">{nota}</p>}
      <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
    </div>
  );
}

export function Espandibile({ titolo, conteggio, children }: { titolo: string; conteggio: number; children: ReactNode }) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-line bg-surface">
      <summary className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-ink-2 hover:bg-surface-2/60 hover:text-ink">
        <span>
          {titolo} <span className="ml-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-3">{conteggio}</span>
        </span>
        <span className="chevron grid size-7 place-items-center rounded-full bg-surface-2 text-ink-2 transition-transform" aria-hidden>
          ›
        </span>
      </summary>
      <div className="divide-y divide-line border-t border-line">{children}</div>
    </details>
  );
}

/** Iniziali per l'avatar: "Roberto Maria Fico" → "RF". */
const iniziali = (nome: string) => {
  const p = nome.replace(/[^\p{L}\s']/gu, "").split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

export function Avatar({ nome, grande = false }: { nome: string; grande?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-[var(--lv-bg,var(--accent-soft))] font-semibold text-[var(--lv,var(--accent))] ${
        grande ? "size-14 text-lg" : "size-10 text-sm"
      }`}
    >
      {iniziali(nome)}
    </span>
  );
}

/** "34 anni · Laurea · Professione: specialisti in scienze giuridiche" */
const profilo = (p: Persona) =>
  [p.eta && `${p.eta} anni`, p.studio, p.professione && `Professione: ${p.professione.charAt(0).toLowerCase()}${p.professione.slice(1)}`]
    .filter(Boolean)
    .join(" · ");

export function PersonaRow({
  p,
  evidenza = false,
  nota,
  href,
  extra,
  azione,
}: {
  p: Persona;
  evidenza?: boolean;
  nota?: string;
  /** Pagina interna della persona (es. scheda del consigliere regionale). */
  href?: string;
  /** Riga aggiuntiva sotto il ruolo, es. il numero di atti presentati. */
  extra?: ReactNode;
  /** Azione sotto la scheda, es. il pulsante "Scrivi a…". */
  azione?: ReactNode;
}) {
  const contatti = [
    p.email && { label: p.email, href: `mailto:${p.email}` },
    p.pec && { label: `PEC ${p.pec}`, href: `mailto:${p.pec}` },
    p.tel && { label: `Tel. ${p.tel}`, href: `tel:${p.tel.replace(/[^\d+]/g, "").slice(0, 13)}` },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className={`flex gap-3 px-4 py-3.5 ${evidenza ? "bg-surface-2/50" : ""}`}>
      <Avatar nome={p.nome} grande={evidenza} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className={evidenza ? "display text-3xl" : "font-semibold"}>
            {href ? (
              <Link href={href} className="hover:text-accent hover:underline">
                {p.nome}
              </Link>
            ) : (
              p.nome
            )}
          </p>
          {p.url && (
            <a href={p.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-accent hover:underline">
              Scheda ufficiale ↗
            </a>
          )}
        </div>
        <p className="text-sm text-ink-2">{p.ruolo}</p>
        {p.dettaglio && <p className="mt-0.5 text-sm text-ink-3">{p.dettaglio}</p>}
        {profilo(p) && <p className="mt-0.5 text-sm text-ink-2">{profilo(p)}</p>}
        {extra && <p className="mt-0.5 text-sm">{extra}</p>}
        {nota && <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">{nota}</p>}
        {contatti.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {contatti.map((c) => (
              <a key={c.href} href={c.href} className="rounded-full bg-surface-2 px-2.5 py-0.5 break-all text-ink-2 hover:bg-accent-soft hover:text-accent">
                {c.label}
              </a>
            ))}
          </p>
        )}
        {p.commissioni && p.commissioni.length > 0 && (
          <p className="mt-1.5 text-sm text-ink-3">Commissioni: {p.commissioni.join(" · ")}</p>
        )}
        {azione && <div className="mt-3">{azione}</div>}
      </div>
    </div>
  );
}

export function Avviso({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">{children}</div>;
}
