import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { caroVita, regioniCaroVita } from "@/lib/caroVita";
import { getConsiglio, regioni } from "@/lib/data";
import { dataLunga, dellaRegione } from "@/lib/format";
import type { Atto, Legge } from "@/lib/types";
import { AttoRow, LeggeCard } from "@/components/consiglio";
import { ComuneSearch } from "@/components/ComuneSearch";
import { Condividi } from "@/components/Condividi";
import { AvvisoArchivio, Fatti } from "@/components/CaroVita";
import { Espandibile, FontiNote } from "@/components/ui";

/** Atti mostrati subito per ogni tema: gli altri restano in un elenco da aprire. */
const PRIMI_ATTI = 5;

export const dynamicParams = false;

export function generateStaticParams() {
  return regioniCaroVita.map((regione) => ({ regione }));
}

export async function generateMetadata({ params }: PageProps<"/caro-vita/[regione]">): Promise<Metadata> {
  const { regione } = await params;
  const reg = regioni.find((r) => r.slug === regione);
  return reg
    ? {
        title: `Caro vita: cosa fa la Regione ${reg.nome}`,
        description: `Proteste e caro vita: cosa sta succedendo, cosa ha annunciato la Regione ${reg.nome}${
          reg.inChiaro ? " e cosa ha fatto il Consiglio regionale su carburanti, trasporti, agricoltura, casa e redditi" : ""
        }, con le fonti.`,
      }
    : {};
}

export default async function CaroVitaRegionePage({ params }: PageProps<"/caro-vita/[regione]">) {
  const slug = (await params).regione;
  const reg = regioni.find((r) => r.slug === slug);
  const contesto = caroVita.contesto.regioni[slug];
  if (!reg || !contesto) notFound();
  const nome = reg.nome;
  // leggi e atti solo dove il Consiglio è in chiaro; altrove la pagina mostra notizie, annunci e a chi rivolgersi
  const cr = getConsiglio(slug);
  const sel = caroVita.regioni[slug];
  const consiglio = cr && sel ? cr.consiglio : undefined;

  // dalla più recente, come nelle altre pagine del Consiglio
  const temi = consiglio
    ? caroVita.temi
        .map((t) => ({
          ...t,
          leggi: consiglio.leggi.filter((l) => sel.leggi[l.id] === t.id) as Legge[],
          atti: consiglio.atti.filter((a) => sel.atti[a.id] === t.id).sort((a, b) => b.data.localeCompare(a.data)) as Atto[],
        }))
        // un tema senza leggi né atti non dice nulla: non lo mostriamo
        .filter((t) => t.leggi.length + t.atti.length > 0)
    : [];


  const tipi = consiglio?.tipi ?? [];
  const totaleAtti = temi.reduce((n, t) => n + t.atti.length, 0);
  const totaleLeggi = temi.reduce((n, t) => n + t.leggi.length, 0);

  return (
    <div className="contenitore py-8">
      <AvvisoArchivio />
      <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3">
        <Link href="/caro-vita/" className="hover:text-ink">
          ← Speciale caro vita
        </Link>
        <Link href={`/regione/${slug}/`} className="hover:text-ink">
          {cr ? `Consiglio regionale ${dellaRegione(nome)}` : `Regione ${nome}: giunta e consiglieri`}
        </Link>
      </nav>

      <header className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-accent uppercase">Speciale caro vita</p>
          <h1 className="display mt-1.5 text-4xl sm:text-5xl">Cosa fa la Regione {nome}</h1>
          <p className="mt-3 max-w-2xl text-base text-ink-2">
            {consiglio ? (
              <>
                Cosa sta succedendo, cosa ha annunciato la Regione e cosa ha fatto il Consiglio regionale dal {dataLunga(consiglio.inizio)}:{" "}
                {totaleLeggi} {totaleLeggi === 1 ? "legge" : "leggi"} e {totaleAtti} atti, spiegati in parole semplici e con il link all&apos;atto
                ufficiale.
              </>
            ) : (
              <>Cosa sta succedendo, cosa ha annunciato la Regione e a chi rivolgerti, con le fonti.</>
            )}
          </p>
        </div>
        <Condividi
          path={`/caro-vita/${slug}/`}
          titolo={`Caro vita: cosa fa la Regione ${nome}`}
          testo={`Caro vita: cosa sta succedendo e cosa hanno fatto Regione e Consiglio regionale ${dellaRegione(nome)}, con le fonti.`}
        />
      </header>

      {/* Contesto: solo fatti verificati su più fonti. Il sito non prende posizione sulle proteste. */}
      <section className="mt-8 rounded-[28px] bg-surface-2 p-5 sm:p-6">
        <h2 className="text-xs font-semibold tracking-wider text-ink-3 uppercase">Cosa sta succedendo in {nome}</h2>
        {contesto?.fatti.length ? (
          <Fatti fatti={contesto.fatti} />
        ) : (
          <p className="mt-3 text-sm text-ink-2">Nelle fonti che abbiamo consultato non risultano proteste specifiche in questa regione.</p>
        )}
        <details className="mt-5 border-t border-line pt-4">
          <summary className="text-sm font-semibold text-ink-2 hover:text-ink">Il quadro nel resto d&apos;Italia</summary>
          <Fatti fatti={caroVita.contesto.generale} />
        </details>
      </section>

      <section className="mt-4 rounded-[28px] border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-xs font-semibold tracking-wider text-ink-3 uppercase">Cosa ha annunciato la Regione</h2>
        {contesto.regione.length ? (
          <>
            <p className="mt-1 text-sm text-ink-3">
              Decisioni e annunci della Regione riportati dalla stampa. Finché non c&apos;è un atto approvato, sono annunci
              {consiglio ? ": qui sotto trovi le leggi già in vigore." : "."}
            </p>
            <Fatti fatti={contesto.regione} />
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-2">Nelle fonti che abbiamo consultato non risultano misure regionali specifiche annunciate in queste settimane.</p>
        )}
      </section>

      <p className="mt-3 text-xs text-ink-3">Notizie aggiornate al {dataLunga(caroVita.aggiornato)}. Ogni fatto è confermato da almeno due fonti.</p>

      <nav aria-label="Temi" className="mt-8 flex flex-wrap gap-2">
        {temi.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 hover:border-ink-3 hover:text-ink">
            {t.nome}
          </a>
        ))}
        <a href="#cosa-puoi-fare" className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-bg hover:opacity-90">
          Cosa puoi fare tu
        </a>
      </nav>

      <div className="mt-6 space-y-10">
        {!consiglio && (
          <section className="rounded-[28px] border border-dashed border-line p-5 sm:p-6">
            <h2 className="display text-3xl">Il Consiglio regionale {dellaRegione(nome)} non è ancora in chiaro</h2>
            <p className="mt-2 max-w-3xl text-sm text-ink-2">
              Per questa regione non abbiamo ancora raccolto leggi e atti del Consiglio. Puoi già vedere presidente, giunta e consiglieri con i
              contatti ufficiali{reg.consiglio && " e consultare il sito del Consiglio regionale"}.
            </p>
            <p className="mt-4 flex flex-wrap gap-2 text-sm">
              <Link href={`/regione/${slug}/`} className="rounded-full bg-ink px-3.5 py-1.5 font-medium text-bg hover:opacity-90">
                Giunta e consiglieri {dellaRegione(nome)} →
              </Link>
              {reg.consiglio && (
                <a href={reg.consiglio.sito} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3.5 py-1.5 text-ink-2 hover:border-ink-3">
                  Sito del Consiglio regionale ↗
                </a>
              )}
              <Link href="/consigli-in-chiaro/" className="rounded-full border border-line px-3.5 py-1.5 text-ink-2 hover:border-ink-3">
                Quali regioni sono in chiaro
              </Link>
            </p>
          </section>
        )}
        {temi.map((t) => (
          <section key={t.id} id={t.id} className="scroll-mt-28">
            <h2 className="display text-3xl">{t.nome}</h2>
            <p className="mt-1 text-sm text-ink-3">{t.descrizione}</p>

            <h3 className="mt-5 text-xs font-semibold tracking-wider text-ink-3 uppercase">Leggi approvate</h3>
            {t.leggi.length > 0 ? (
              <div className="mt-2 grid items-stretch gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {t.leggi.map((l) => (
                  <div key={l.id} className="rounded-[28px] border border-line bg-surface p-1">
                    <LeggeCard legge={l} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-3">
                In questa legislatura il Consiglio non ha approvato leggi specifiche su questo tema.
              </p>
            )}

            <h3 className="mt-6 text-xs font-semibold tracking-wider text-ink-3 uppercase">
              Atti presentati in Consiglio <span className="ml-1 rounded-full bg-surface-2 px-2 py-0.5 font-medium normal-case">{t.atti.length}</span>
            </h3>
            {t.atti.length > 0 ? (
              <>
                <p className="mt-1 text-sm text-ink-3">Interrogazioni, mozioni e proposte di legge dei consiglieri e della Giunta, dalla più recente.</p>
                <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                  {t.atti.slice(0, PRIMI_ATTI).map((a) => (
                    <AttoRow key={a.id} atto={a} tipi={tipi} regione={slug} />
                  ))}
                </div>
                {t.atti.length > PRIMI_ATTI && (
                  <div className="mt-2">
                    <Espandibile titolo="Atti precedenti" conteggio={t.atti.length - PRIMI_ATTI}>
                      {t.atti.slice(PRIMI_ATTI).map((a) => (
                        <AttoRow key={a.id} atto={a} tipi={tipi} regione={slug} />
                      ))}
                    </Espandibile>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-3">
                Nessun atto su questo tema tra quelli pubblicati dal Consiglio.
              </p>
            )}
          </section>
        ))}

        <section id="cosa-puoi-fare" className="scroll-mt-28 rounded-[28px] bg-[var(--lv-regione-bg)] p-5 sm:p-6">
          <h2 className="display text-3xl">Cosa puoi fare tu</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              {consiglio ? (
                <>
                  <p className="font-semibold">Scrivi ai consiglieri eletti nella tua provincia</p>
                  <p className="mt-1 text-sm text-ink-2">
                    Cerca il tuo comune: trovi i consiglieri regionali della tua circoscrizione con i loro contatti istituzionali e un messaggio già
                    impostato da completare. Il sito non invia e non salva nulla: si apre il tuo programma di posta.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Trova chi ti rappresenta in Regione</p>
                  <p className="mt-1 text-sm text-ink-2">
                    Cerca il tuo comune: trovi presidente, giunta e consiglieri regionali, con il link ai contatti ufficiali, e chi ti rappresenta in
                    Comune, in Parlamento e in Europa.
                  </p>
                </>
              )}
              <div className="mt-3">
                <ComuneSearch sezione="regione" />
              </div>
            </div>
            <div className="space-y-3 text-sm text-ink-2">
              {consiglio && (
                <p>
                  <span className="font-semibold text-ink">Chiedi a che punto è un atto.</span> Interrogazioni e mozioni hanno un primo firmatario:
                  puoi chiedergli se la Giunta ha risposto o se la mozione è stata votata.
                </p>
              )}
              <p>
                <span className="font-semibold text-ink">Chiedi come accedere ai fondi annunciati.</span> Per bandi e contributi regionali gli uffici
                della Regione e le associazioni di categoria sanno indicare requisiti e scadenze.
              </p>
              <p>
                <span className="font-semibold text-ink">Prezzo del carburante, accise e tavolo con il Governo</span> sono decisioni nazionali: per
                deputati e senatori del tuo collegio cerca il tuo comune qui accanto, oppure consulta{" "}
                <a href="https://www.dovevannoinostrisoldi.com/politici" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                  DoveVannoINostriSoldi
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <p className="text-xs text-ink-3">
          Selezione di leggi e atti a cura della redazione, aggiornata al {dataLunga(caroVita.aggiornato)}. Ti sembra che manchi qualcosa? Segnalacelo.
        </p>
        {cr && <FontiNote fonti={[cr.fonti.atti]} />}
      </div>
    </div>
  );
}
