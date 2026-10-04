import Link from "next/link";
import { comuni, consiglieriPerEmiciclo, consiglio, meta, parlamento, regione, regioni, tuttiGliEurodeputati } from "@/lib/data";
import { ComuneSearch } from "@/components/ComuneSearch";
import { Condividi } from "@/components/Condividi";
import { Emiciclo } from "@/components/Emiciclo";
import { ILLUSTRAZIONE } from "@/components/Illustrazioni";
import { stileLivello, type LivelloId } from "@/components/ui";

const FAQ = [
  {
    d: "È un sito dello Stato?",
    r: "No. È un progetto civico indipendente. Usa solo dati pubblici ufficiali (Ministero dell'Interno, ISTAT, Ministero della Salute, Camera, Senato, Parlamento europeo e, per la Campania, il Consiglio regionale) e ogni dato rimanda alla sua fonte.",
  },
  {
    d: "Da dove vengono i dati e ogni quanto si aggiornano?",
    r: "Dai siti e dagli open data ufficiali, raccolti in automatico ogni settimana. La pagina Fonti elenca ogni fonte, la data di aggiornamento e i limiti noti.",
  },
  {
    d: "Perché atti e leggi regionali solo per la Campania?",
    r: "Comuni, Regioni, Parlamento ed Europa coprono tutta Italia. Il Consiglio regionale «in chiaro» (atti, leggi spiegate, mappa dei consiglieri) richiede di leggere il sito di ogni Consiglio, ognuno fatto in modo diverso: siamo partiti dalla Campania e aggiungeremo le altre regioni.",
  },
  {
    d: "Come scrivo al mio consigliere regionale?",
    r: "Cerca il tuo comune e apri la sezione Regione: trovi i consiglieri e il link al sito del Consiglio regionale con i loro contatti. Per la Campania c'è anche «Scrivi a…», che prepara una bozza di email dal tuo programma di posta. Il sito non invia e non salva nulla.",
  },
  {
    d: "Mi servono dati personali o un account?",
    r: "No. Basta il nome del comune. Il sito è statico: le ricerche restano nel tuo browser.",
  },
  {
    d: "Ho trovato un errore: cosa faccio?",
    r: "Controlla la fonte ufficiale linkata accanto al dato: è quella che fa fede. Alcuni dati (per esempio i consiglieri subentrati) sono segnati come da verificare.",
  },
];

export default function Home() {
  const consiglieriRegionali = regioni.reduce((n, r) => n + (r.inChiaro ? regione.consiglieri.length : r.consiglieri.length), 0);
  const deputati = Object.values(parlamento.camera).flat().length;
  const senatori = Object.keys(parlamento.senato.uninominali).length + Object.values(parlamento.senato.proporzionale).flat().length;
  const sindaci = comuni.filter((c) => c.sindaco).length;

  const livelli: { id: LivelloId; titolo: string; testo: string; numero: string; unita: string }[] = [
    { id: "comune", titolo: "Comune", testo: "Sindaco, giunta e consiglio comunale. E se il Comune è commissariato, chi lo guida.", numero: sindaci.toLocaleString("it-IT"), unita: "sindaci" },
    { id: "regione", titolo: "Regione", testo: "Presidente, giunta e consiglieri della tua regione, con i contatti ufficiali.", numero: consiglieriRegionali.toLocaleString("it-IT"), unita: "consiglieri regionali" },
    { id: "parlamento", titolo: "Parlamento", testo: "Deputati e senatori dei collegi che comprendono il tuo comune.", numero: String(deputati + senatori), unita: "parlamentari" },
    { id: "europa", titolo: "Europa", testo: "Gli eurodeputati della circoscrizione in cui voti.", numero: String(tuttiGliEurodeputati().length), unita: "eurodeputati" },
  ];

  return (
    <div>
      {/* HERO */}
      <section className="contenitore pt-14 pb-16 text-center sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          {comuni.length.toLocaleString("it-IT")} comuni in tutta Italia · dati aggiornati al {meta.generato.split("-").reverse().join("/")}
        </p>
        <h1 className="display mx-auto mt-6 max-w-5xl text-6xl sm:text-8xl lg:text-[8.5rem]">
          Chi mi <em className="text-accent">rappresenta</em>?
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-2 sm:text-xl">
          Dal sindaco al Parlamento europeo: scrivi il tuo comune e trovi tutte le persone elette per te, in una pagina, con le
          fonti ufficiali.
        </p>
        <div
          id="cerca"
          className="mx-auto mt-10 max-w-2xl scroll-mt-28 rounded-[28px] border border-line bg-surface p-4 text-left shadow-[0_20px_60px_-25px_rgba(20,34,31,0.35)]"
        >
          <ComuneSearch autoFocus />
        </div>
      </section>

      {/* COSA VUOI FARE: le quattro strade principali, chiare e grandi */}
      <section aria-labelledby="cosa-fare" className="contenitore pb-16">
        <h2 id="cosa-fare" className="display text-center text-5xl sm:text-6xl">
          Cosa vuoi fare?
        </h2>
        <div className="mx-auto mt-8 grid max-w-7xl gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {[
            {
              href: "#cerca",
              icona: "👥",
              titolo: "Sapere chi mi rappresenta",
              testo: "Scrivi il tuo comune qui sopra: sindaco, consiglieri, parlamentari ed eurodeputati in una pagina.",
            },
            {
              href: "/a-chi-rivolgersi/",
              icona: "🧭",
              titolo: "Ho un problema: a chi mi rivolgo?",
              testo: "Una buca, la ASL, la pensione, il treno: chi decide, il primo passo e a chi scrivere.",
            },
            {
              href: "/regione/",
              icona: "🏛️",
              titolo: "Conoscere la mia Regione",
              testo: "Presidente, giunta e consiglieri delle 20 regioni, con i contatti ufficiali.",
            },
            {
              href: "/regione/campania/leggi/",
              icona: "📜",
              titolo: "Capire cosa decide la Regione",
              testo: "Per la Campania: le leggi regionali spiegate in parole semplici e gli atti dei consiglieri. Le altre regioni arriveranno.",
            },
            {
              href: "/chiedi-un-documento/",
              icona: "📄",
              titolo: "Chiedere un documento",
              testo: "Quanto è costato un lavoro, cosa dice un contratto: chiunque può chiederlo. Ti prepariamo la richiesta.",
            },
            {
              href: "#cerca",
              icona: "🗳️",
              titolo: "Vedere come ha votato il mio comune",
              testo: "Comunali, regionali, politiche ed europee: risultati e affluenza, confrontati con la media della tua regione.",
            },
          ].map((x) => (
            <Link
              key={x.titolo}
              href={x.href}
              data-umami-event="home-cosa-vuoi-fare"
              data-umami-event-scelta={x.titolo}
              className="group flex gap-4 rounded-[28px] border-2 border-line bg-surface p-5 hover:border-accent sm:p-6"
            >
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent-soft text-3xl" aria-hidden>
                {x.icona}
              </span>
              <span>
                <span className="block text-2xl font-semibold group-hover:text-accent">{x.titolo} →</span>
                <span className="mt-1 block text-lg text-ink-2">{x.testo}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* QUATTRO LIVELLI */}
      <section className="contenitore">
        <h2 className="display text-5xl sm:text-6xl">Quattro livelli, una pagina.</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-2">Ogni giorno qualcuno decide per te in Comune, in Regione, a Roma e a Bruxelles. Ecco chi.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {livelli.map((l, i) => {
            const Ill = ILLUSTRAZIONE[l.id];
            return (
              <div key={l.id} style={stileLivello(l.id)} className="puntini flex flex-col rounded-[32px] bg-[var(--lv-bg)] p-2">
                <div className="grid h-40 place-items-center">
                  <Ill className="h-28" />
                </div>
                <div className="flex-1 rounded-[26px] bg-surface p-5">
                  <p className="text-xs font-semibold tracking-wider text-[var(--lv)] uppercase">Livello {i + 1}</p>
                  <h3 className="display mt-1 text-4xl">{l.titolo}</h3>
                  <p className="mt-2 text-sm text-ink-2">{l.testo}</p>
                  <p className="mt-4 flex items-baseline gap-2 border-t border-line pt-3">
                    <span className="display text-4xl text-[var(--lv)]">{l.numero}</span>
                    <span className="text-sm text-ink-3">{l.unita} in Italia</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CONSIGLIO REGIONALE */}
      <section className="contenitore mt-20">
        <div className="grid items-center gap-8 rounded-[32px] border border-line bg-surface p-6 sm:p-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[var(--lv-regione)] uppercase">Il primo Consiglio regionale in chiaro</p>
            <h2 className="display mt-2 text-5xl sm:text-6xl">Campania: {regione.consiglieri.length} consiglieri. Tocca un punto.</h2>
            <p className="mt-4 max-w-lg text-lg text-ink-2">
              Ogni punto è una persona, colorata per gruppo. Apri la sua scheda: contatti, commissioni, gli atti che ha
              presentato e un modo semplice per scrivergli. È il modello che vogliamo portare in tutte le regioni.
            </p>
            <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
              <Link href="/regione/campania/attivita/" className="group rounded-2xl bg-[var(--lv-regione-bg)] p-4 hover:opacity-90">
                <span className="block text-sm text-ink-2">Atti presentati</span>
                <span className="display block text-5xl">{consiglio.atti.length}</span>
                <span className="text-sm font-medium text-[var(--lv-regione)] group-hover:underline">Cosa fanno →</span>
              </Link>
              <Link href="/regione/campania/leggi/" className="group rounded-2xl bg-[var(--lv-comune-bg)] p-4 hover:opacity-90">
                <span className="block text-sm text-ink-2">Leggi approvate</span>
                <span className="display block text-5xl">{consiglio.leggi.length}</span>
                <span className="text-sm font-medium text-[var(--lv-comune)] group-hover:underline">Spiegate semplici →</span>
              </Link>
            </div>
          </div>
          <Emiciclo consiglieri={consiglieriPerEmiciclo()} presidente={regione.presidente} gruppi={regione.gruppi} tipi={consiglio.tipi} />
        </div>
      </section>

      {/* COSA FA / NON FA */}
      <section className="contenitore mt-20">
        <h2 className="display text-5xl sm:text-6xl">Cosa fa, cosa non fa.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            {
              lv: "comune",
              titolo: "Fa",
              segno: "✓",
              voci: ["Ti dice chi ti rappresenta, a ogni livello", "Cita sempre la fonte ufficiale", "Ti aiuta a scrivere ai tuoi eletti", "Spiega leggi e atti in parole semplici"],
            },
            {
              lv: "parlamento",
              titolo: "Non fa",
              segno: "✕",
              voci: ["Non è un sito dello Stato", "Non chiede dati personali né account", "Non dà giudizi politici: mostra i fatti", "Non sostituisce la fonte: verifica sempre lì"],
            },
          ].map((b) => (
            <div key={b.titolo} style={stileLivello(b.lv as LivelloId)} className="puntini rounded-[32px] bg-[var(--lv-bg)] p-2">
              <div className="h-full rounded-[26px] bg-surface p-6">
                <p className="text-xs font-semibold tracking-wider text-[var(--lv)] uppercase">{b.titolo}</p>
                <ul className="mt-3 space-y-3 text-lg">
                  {b.voci.map((x) => (
                    <li key={x} className="flex gap-3">
                      <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--lv-bg)] text-sm text-[var(--lv)]" aria-hidden>
                        {b.segno}
                      </span>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="contenitore mt-20 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div>
          <h2 className="display text-5xl text-ink-3 sm:text-6xl">Domande frequenti</h2>
          <div className="mt-6">
            <Condividi
              path="/"
              titolo="Chi mi rappresenta"
              testo="Scrivi il tuo comune e scopri chi ti rappresenta: sindaco, Regione, Parlamento ed Europa in una pagina, con le fonti ufficiali."
            />
          </div>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.d} className="group py-1">
              <summary className="flex items-center justify-between gap-4 py-4 text-lg font-medium">
                {f.d}
                <span className="chevron grid size-8 shrink-0 place-items-center rounded-full bg-surface text-ink-2 transition-transform" aria-hidden>
                  ›
                </span>
              </summary>
              <p className="pb-5 text-ink-2">{f.r}</p>
            </details>
          ))}
          <p className="py-4 text-sm text-ink-3">
            Tutti i dettagli su fonti e limiti nella pagina{" "}
            <Link href="/fonti/" className="text-accent underline">
              Fonti
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
