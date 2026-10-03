import type { Elezione, VotoVoce } from "@/lib/types";
import { stileLivello, type LivelloId } from "./ui";

const LIVELLO: Record<Elezione["id"], LivelloId> = { comunali: "comune", regionali: "regione", politiche: "parlamento", europee: "europa" };
const ORDINE: Elezione["id"][] = ["comunali", "regionali", "politiche", "europee"];
const COSA: Record<Elezione["id"], string> = {
  comunali: "Si sceglie il sindaco e il consiglio comunale.",
  regionali: "Si sceglie il presidente della Regione e il consiglio regionale.",
  politiche: "Si eleggono deputati e senatori. Qui i voti alle liste per la Camera.",
  europee: "Si eleggono i deputati italiani al Parlamento europeo.",
};

const perc = (n: number) => `${n.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
const intero = (n: number) => n.toLocaleString("it-IT");

/** Una riga con nome, barra e percentuale: la barra è decorativa, il dato è sempre scritto. */
function Barra({ v, max, evidenza }: { v: VotoVoce; max: number; evidenza?: boolean }) {
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`min-w-0 ${evidenza ? "font-semibold" : ""}`}>
          {v.nome}
          {v.eletto && (
            <span className="ml-2 inline-block rounded-full bg-[var(--lv)] px-2 py-0.5 align-middle text-xs font-semibold text-white">{v.f ? "Eletta" : "Eletto"}</span>
          )}
        </span>
        <span className="shrink-0 font-semibold tabular-nums">{perc(v.pct)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full bg-[var(--lv)]" style={{ width: `${max ? Math.max(1.5, (v.pct / max) * 100) : 0}%`, opacity: evidenza ? 1 : 0.55 }} />
      </div>
      {v.liste && v.liste.length > 0 && <p className="text-sm text-ink-3">{v.liste.length > 1 ? "Liste" : "Lista"}: {v.liste.join(" · ")}</p>}
    </li>
  );
}

function Affluenza({ e, regione }: { e: Elezione; regione: string }) {
  if (e.affluenza === undefined) return null;
  const d = e.affluenzaRegione !== undefined ? e.affluenza - e.affluenzaRegione : undefined;
  const confronto =
    d === undefined ? null : Math.abs(d) < 1 ? `come la media della regione` : d > 0 ? `più della media della regione` : `meno della media della regione`;
  return (
    <div className="rounded-2xl bg-[var(--lv-bg)] p-4">
      <p className="text-sm font-semibold tracking-wide text-[var(--lv)] uppercase">Quanti sono andati a votare</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
        <span className="display text-5xl">{perc(e.affluenza)}</span>
        {confronto && (
          <span className="text-base text-ink-2">
            {confronto} ({perc(e.affluenzaRegione!)})
          </span>
        )}
      </p>
      {e.votanti !== undefined && e.elettori !== undefined && (
        <p className="mt-1 text-sm text-ink-2">
          {intero(e.votanti)} votanti su {intero(e.elettori)} aventi diritto
        </p>
      )}
      <div className="mt-3 space-y-1.5" aria-hidden>
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <span className="w-16 shrink-0">Qui</span>
          <span className="h-2 flex-1 rounded-full bg-surface">
            <span className="block h-full rounded-full bg-[var(--lv)]" style={{ width: `${e.affluenza}%` }} />
          </span>
        </div>
        {e.affluenzaRegione !== undefined && (
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <span className="w-16 shrink-0 truncate" title={regione}>{regione}</span>
            <span className="h-2 flex-1 rounded-full bg-surface">
              <span className="block h-full rounded-full bg-ink-3" style={{ width: `${e.affluenzaRegione}%` }} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SchedaElezione({ e, comune, regione }: { e: Elezione; comune: string; regione: string }) {
  const candidati = e.candidati ?? [];
  // alle comunali dei piccoli comuni ogni candidato ha una sola lista: le liste non aggiungono nulla
  const liste = e.liste ?? [];
  const maxC = Math.max(...candidati.map((c) => c.pct), 0);
  const maxL = Math.max(...liste.map((c) => c.pct), 0);
  const vincitore = candidati.find((c) => c.eletto) ?? (e.id === "comunali" ? undefined : candidati[0]);
  return (
    <article style={stileLivello(LIVELLO[e.id])} className="flex flex-col gap-4 rounded-[28px] border-2 border-line bg-surface p-5">
      <header>
        <p className="text-sm font-semibold tracking-wider text-[var(--lv)] uppercase">{e.data}</p>
        <h3 className="display mt-1 text-3xl sm:text-4xl">
          {e.titolo}
          {e.turno === 2 && <span className="ml-2 align-middle text-base font-semibold text-ink-2">(ballottaggio)</span>}
        </h3>
        <p className="mt-1 text-base text-ink-2">{COSA[e.id]}</p>
      </header>
      <Affluenza e={e} regione={regione} />
      {candidati.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold tracking-wider text-ink-3 uppercase">
            {e.id === "comunali" ? "Candidati sindaco" : "Candidati presidente"} · voti a {comune}
          </h4>
          {e.id === "comunali" && e.turno === 2 && (
            <p className="mt-1 text-sm text-ink-3">Nessuno aveva superato il 50% al primo turno: si è votato di nuovo tra i primi due.</p>
          )}
          <ol className="mt-3 space-y-3">
            {candidati.map((c) => (
              <Barra key={c.nome} v={c} max={maxC} evidenza={c === vincitore} />
            ))}
          </ol>
          {(e.candidatiAltri ?? 0) > 0 && <p className="mt-2 text-sm text-ink-3">e altri {e.candidatiAltri} candidati</p>}
        </div>
      )}
      {liste.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold tracking-wider text-ink-3 uppercase">Le liste più votate a {comune}</h4>
          <ol className="mt-3 space-y-3">
            {liste.map((l, i) => (
              <Barra key={l.nome} v={l} max={maxL} evidenza={i === 0} />
            ))}
          </ol>
          {(e.listeAltre ?? 0) > 0 && <p className="mt-2 text-sm text-ink-3">e altre {e.listeAltre} liste</p>}
        </div>
      )}
    </article>
  );
}

/** "Come si è votato": ultime elezioni nel comune, dalla più vicina (comunali) alla più lontana (europee). */
export function RisultatiElezioni({ elezioni, comune, regione }: { elezioni: Elezione[]; comune: string; regione: string }) {
  const ordinate = [...elezioni].sort((a, b) => ORDINE.indexOf(a.id) - ORDINE.indexOf(b.id));
  // il ballottaggio ha sempre meno votanti: non lo confrontiamo con le altre elezioni
  const conAffluenza = ordinate.filter((e) => e.affluenza !== undefined && e.turno !== 2);
  const minima = conAffluenza.reduce<Elezione | undefined>((m, e) => (!m || e.affluenza! < m.affluenza! ? e : m), undefined);
  return (
    <div className="space-y-5">
      {minima && conAffluenza.length > 1 && (
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-lg">
          <strong>In breve:</strong> a {comune} si è votato di meno alle {minima.titolo.replace("Elezioni ", "").replace(" (Camera)", "")} (
          {perc(minima.affluenza!)}) e di più alle{" "}
          {(() => {
            const max = conAffluenza.reduce((m, e) => (e.affluenza! > m.affluenza! ? e : m));
            return `${max.titolo.replace("Elezioni ", "").replace(" (Camera)", "")} (${perc(max.affluenza!)})`;
          })()}
          .
        </p>
      )}
      {!ordinate.some((e) => e.id === "comunali") && (
        <p className="text-base text-ink-2">
          I risultati delle ultime comunali di {comune} non sono negli open data che usiamo: li trovi sull&apos;archivio Eligendo del
          Ministero dell&apos;Interno.
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        {ordinate.map((e) => (
          <SchedaElezione key={e.id} e={e} comune={comune} regione={regione} />
        ))}
      </div>
    </div>
  );
}
