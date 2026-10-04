import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { circoscrizioneEuropea, fonte, regioni, regioniAggiornate } from "@/lib/data";
import { Avviso, Espandibile, Gruppo, Livello, PersonaRow } from "@/components/ui";
import { Condividi } from "@/components/Condividi";
import { CopiaTesto } from "@/components/CopiaTesto";
import { ComuneSearch } from "@/components/ComuneSearch";

// Pagina essenziale di ogni regione. La Campania ha la sua pagina "in chiaro" in /regione/campania/.
export const dynamicParams = false;

export function generateStaticParams() {
  return regioni.filter((r) => !r.inChiaro).map((r) => ({ regione: r.slug }));
}

const trova = async (params: Promise<{ regione: string }>) => {
  const { regione } = await params;
  return regioni.find((r) => r.slug === regione && !r.inChiaro);
};

export async function generateMetadata({ params }: PageProps<"/regione/[regione]">): Promise<Metadata> {
  const r = await trova(params);
  return r
    ? {
        title: `Regione ${r.nome}: presidente, giunta e consiglio regionale`,
        description: `Chi governa la Regione ${r.nome}: presidente, assessori e consiglieri regionali, con i contatti ufficiali della Regione e del Consiglio regionale.`,
      }
    : {};
}

export default async function RegionePage({ params }: PageProps<"/regione/[regione]">) {
  const r = await trova(params);
  if (!r) notFound();
  const circ = circoscrizioneEuropea(r.codice);

  return (
    <div className="contenitore py-8">
      <nav aria-label="Percorso" className="text-base text-ink-3">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        ›{" "}
        <Link href="/regione/" className="hover:text-ink">
          Regioni
        </Link>{" "}
        › <span className="text-ink-2">{r.nome}</span>
      </nav>
      <header className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="display text-5xl sm:text-6xl">{r.nome}</h1>
          <p className="mt-3 max-w-2xl text-base text-ink-2">
            Chi governa la Regione: presidente, giunta e consiglio regionale. Vota per il Parlamento europeo nella circoscrizione{" "}
            {circ.nome}.
          </p>
        </div>
        <Condividi
          path={`/regione/${r.slug}/`}
          titolo={`Regione ${r.nome}`}
          testo={`Chi governa la Regione ${r.nome}: presidente, giunta e consiglieri regionali, con i contatti ufficiali.`}
        />
      </header>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Livello
          id="regione"
          numero={2}
          titolo={`Regione ${r.nome}`}
          sottotitolo="Decide su sanità, trasporti regionali, lavoro e formazione, ambiente e fondi europei."
          fonti={[fonte("viminale")]}
        >
          {r.presidente ? (
            <Gruppo titolo="Presidente della Regione">
              <PersonaRow p={r.presidente} evidenza />
            </Gruppo>
          ) : (
            <Avviso>L&apos;anagrafe del Ministero dell&apos;Interno non riporta ancora il presidente della Regione {r.nome}.</Avviso>
          )}
          {r.giunta.length > 0 && (
            <Espandibile titolo="Giunta regionale" conteggio={r.giunta.length}>
              {r.giunta.map((p) => (
                <PersonaRow key={p.nome + p.ruolo} p={p} />
              ))}
            </Espandibile>
          )}
          {r.consiglieri.length > 0 && (
            <Espandibile titolo="Consiglio regionale" conteggio={r.consiglieri.length}>
              {r.consiglieri.map((p) => (
                <PersonaRow key={p.nome + p.ruolo} p={p} />
              ))}
            </Espandibile>
          )}
          <Avviso>
            {r.fonte
              ? `Dati letti dal sito ufficiale (${r.fonte.nome}).`
              : r.consiglieri.length
              ? `Dati dell'anagrafe degli amministratori regionali del Ministero dell'Interno${regioniAggiornate ? `, aggiornata al ${regioniAggiornate}` : ""}: dopo un'elezione recente possono essere incompleti.`
              : `L'anagrafe del Ministero dell'Interno non riporta ancora i consiglieri della Regione ${r.nome}.`}{" "}
            {r.consiglio && (
              <>
                L&apos;elenco completo, i contatti dei consiglieri e le attività sono sul sito del{" "}
                <a href={r.consiglio.sito} target="_blank" rel="noreferrer" className="font-semibold underline">
                  {r.consiglio.nome} ↗
                </a>
                .
              </>
            )}
          </Avviso>
        </Livello>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-line bg-surface p-5">
            <h2 className="text-base font-semibold">Contatti ufficiali</h2>
            <dl className="mt-3 space-y-3 text-base">
              {r.contatti?.pec && (
                <div>
                  <dt className="text-sm font-semibold tracking-wide text-ink-3 uppercase">PEC della Regione</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-2">
                    <a href={`mailto:${r.contatti.pec}`} className="font-semibold break-all text-accent underline">
                      {r.contatti.pec}
                    </a>
                    <CopiaTesto testo={r.contatti.pec} etichetta="Copia" />
                  </dd>
                </div>
              )}
              {r.contatti?.sito && (
                <div>
                  <dt className="text-sm font-semibold tracking-wide text-ink-3 uppercase">Sito della Regione</dt>
                  <dd className="mt-1">
                    <a href={r.contatti.sito} target="_blank" rel="noreferrer" className="font-semibold break-all text-accent underline">
                      {r.contatti.sito.replace(/^https?:\/\//, "")} ↗
                    </a>
                  </dd>
                </div>
              )}
              {r.consiglio && (
                <div>
                  <dt className="text-sm font-semibold tracking-wide text-ink-3 uppercase">{r.consiglio.nome}</dt>
                  <dd className="mt-1">
                    <a href={r.consiglio.sito} target="_blank" rel="noreferrer" className="font-semibold break-all text-accent underline">
                      {r.consiglio.sito.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-4 text-base text-ink-2">
              Vuoi un documento della Regione (contratti, spese, controlli)?{" "}
              <Link href="/chiedi-un-documento/" className="font-semibold text-accent underline">
                Chiedi un documento →
              </Link>
            </p>
          </section>
          <section className="rounded-3xl border border-line bg-surface p-5">
            <h2 className="text-base font-semibold">I tuoi rappresentanti, dal Comune all&apos;Europa</h2>
            <p className="mt-1 text-base text-ink-2">Cerca il tuo comune: sindaco, deputati, senatori ed eurodeputati della tua zona.</p>
            <div className="mt-3">
              <ComuneSearch etichetta="Il tuo comune" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
