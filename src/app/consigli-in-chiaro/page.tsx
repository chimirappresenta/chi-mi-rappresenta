import type { Metadata } from "next";
import Link from "next/link";
import { consiglio, regione, regioni } from "@/lib/data";
import { Condividi } from "@/components/Condividi";
import { stileLivello } from "@/components/ui";

export const metadata: Metadata = {
  title: "Consigli regionali in chiaro",
  description:
    "Atti dei consiglieri, leggi spiegate in parole semplici e mappa del Consiglio: la Campania è la prima regione in chiaro, le altre arriveranno una alla volta.",
};

const REPO = process.env.NEXT_PUBLIC_REPO_SEGNALAZIONI ?? "";

export default function ConsigliInChiaroPage() {
  const campania = regioni.find((r) => r.inChiaro);
  const inArrivo = regioni.filter((r) => !r.inChiaro);
  const cosa = [
    { icona: "🗂️", titolo: "Gli atti dei consiglieri", testo: "Interrogazioni, mozioni, proposte di legge: chi le ha firmate, su cosa e com'è andata." },
    { icona: "📜", titolo: "Le leggi in parole semplici", testo: "Ogni legge regionale con il testo ufficiale e un riassunto chiaro di cosa cambia." },
    { icona: "🏛️", titolo: "La mappa del Consiglio", testo: "Ogni consigliere è un punto, colorato per gruppo: si apre la scheda con contatti e attività." },
    { icona: "📍", titolo: "Il tuo comune in Regione", testo: "Quando un atto o una legge parla del tuo comune, lo trovi nella sua pagina." },
  ];

  return (
    <div className="contenitore py-8" style={stileLivello("regione")}>
      <nav aria-label="Percorso" className="text-base text-ink-3">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        › <span className="text-ink-2">Consigli regionali in chiaro</span>
      </nav>
      <header className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="display text-4xl sm:text-5xl">Consigli regionali in chiaro</h1>
          <p className="mt-4 max-w-3xl text-lg text-ink-2">
            Cosa fa davvero il Consiglio della tua regione? Lo raccontiamo con i dati ufficiali, in parole semplici. Siamo partiti dalla
            Campania e aggiungeremo le altre regioni una alla volta.
          </p>
        </div>
        <Condividi
          path="/consigli-in-chiaro/"
          titolo="Consigli regionali in chiaro"
          testo="Atti dei consiglieri, leggi spiegate in parole semplici e mappa del Consiglio regionale: la Campania è la prima regione in chiaro."
        />
      </header>

      <section aria-labelledby="cosa-trovi" className="mt-10">
        <h2 id="cosa-trovi" className="text-sm font-semibold tracking-wider text-ink-3 uppercase">
          Cosa vuol dire &quot;in chiaro&quot;
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cosa.map((x) => (
            <li key={x.titolo} className="rounded-3xl bg-[var(--lv-bg)] p-5">
              <span className="text-3xl" aria-hidden>
                {x.icona}
              </span>
              <p className="mt-2 text-base font-semibold">{x.titolo}</p>
              <p className="text-base text-ink-2">{x.testo}</p>
            </li>
          ))}
        </ul>
      </section>

      {campania && (
        <section aria-labelledby="disponibile" className="mt-12">
          <h2 id="disponibile" className="display text-3xl sm:text-4xl">
            Già in chiaro
          </h2>
          <Link
            href="/regione/campania/"
            className="group mt-5 grid gap-6 rounded-[28px] border border-[var(--lv)] bg-surface p-6 hover:shadow-[0_20px_60px_-30px_rgba(20,34,31,0.35)] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
          >
            <div>
              <span className="inline-flex rounded-full bg-[var(--lv-bg)] px-3 py-1 text-sm font-semibold text-[var(--lv)]">Disponibile</span>
              <p className="display mt-3 text-4xl group-hover:text-[var(--lv)]">{campania.nome}</p>
              <p className="mt-2 text-base text-ink-2">
                Il Consiglio regionale della Campania: consiglieri, gruppi, atti e leggi della legislatura in corso.
              </p>
              <span className="mt-4 inline-block text-base font-semibold text-[var(--lv)] group-hover:underline">Apri il Consiglio regionale →</span>
            </div>
            <dl className="grid grid-cols-3 gap-3 self-center">
              <div className="rounded-2xl bg-[var(--lv-bg)] p-3 text-center">
                <dt className="text-sm text-ink-2">Consiglieri</dt>
                <dd className="display text-3xl">{regione.consiglieri.length}</dd>
              </div>
              <div className="rounded-2xl bg-[var(--lv-bg)] p-3 text-center">
                <dt className="text-sm text-ink-2">Atti</dt>
                <dd className="display text-3xl">{consiglio.atti.length}</dd>
              </div>
              <div className="rounded-2xl bg-[var(--lv-bg)] p-3 text-center">
                <dt className="text-sm text-ink-2">Leggi</dt>
                <dd className="display text-3xl">{consiglio.leggi.length}</dd>
              </div>
            </dl>
          </Link>
        </section>
      )}

      <section aria-labelledby="in-arrivo" className="mt-12">
        <h2 id="in-arrivo" className="display text-3xl sm:text-4xl">
          In arrivo
        </h2>
        <p className="mt-2 max-w-3xl text-base text-ink-2">
          Ogni Consiglio regionale pubblica atti e leggi sul proprio sito, ognuno in modo diverso: per ciascuno serve un lavoro dedicato.
          Nel frattempo, per ogni regione trovi già presidente, giunta, consiglieri e contatti ufficiali.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {inArrivo.map((r) => (
            <li key={r.codice}>
              <Link
                href={`/regione/${r.slug}/`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 hover:border-[var(--lv)]"
              >
                <span>
                  <span className="block text-base font-semibold">{r.nome}</span>
                  <span className="block text-sm text-ink-3">In arrivo · intanto: presidente, giunta e consiglieri</span>
                </span>
                <span className="text-lg text-ink-3" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-[28px] bg-[var(--lv-bg)] p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Vuoi la tua regione prima delle altre?</h2>
        <p className="mt-2 max-w-3xl text-base text-ink-2">
          Diccelo: le regioni più richieste arriveranno per prime. Il progetto è aperto (licenza MIT): se sai programmare puoi anche
          contribuire al &quot;lettore&quot; del Consiglio della tua regione, sul modello di quello della Campania.
        </p>
        {REPO && (
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`https://github.com/${REPO}/issues/new?title=${encodeURIComponent("[Regione in chiaro] ")}`}
              target="_blank"
              rel="noreferrer"
              data-umami-event="richiesta-regione"
              className="inline-flex min-h-11 items-center rounded-full bg-[var(--lv)] px-5 text-base font-semibold text-white hover:opacity-90"
            >
              Chiedi la tua regione ↗
            </a>
            <a
              href={`https://github.com/${REPO}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--lv)] bg-surface px-5 text-base font-semibold text-[var(--lv)] hover:opacity-90"
            >
              Il codice del progetto ↗
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
