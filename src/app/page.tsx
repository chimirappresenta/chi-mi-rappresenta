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
    d: "Cosa fa e cosa non fa?",
    r: "Ti dice chi ti rappresenta a ogni livello, cita sempre la fonte ufficiale, ti aiuta a scrivere ai tuoi eletti e spiega leggi e atti in parole semplici. Non chiede dati personali né account, non dà giudizi politici e non sostituisce la fonte: verifica sempre lì.",
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
    d: "Chi c'è dietro?",
    r: "È un progetto personale di Gerardo Dell'Aquila, nato dall'idea che i dati pubblici esistono già ma sono sparsi e difficili da leggere: qui li mettiamo insieme e li rendiamo chiari. Per segnalazioni e proposte scrivi a infochimirappresenta@gmail.com o usa «Segnala un errore» accanto a ogni dato.",
  },
  {
    d: "Come usate l'intelligenza artificiale?",
    r: "Per scrivere il codice del sito e per i riassunti delle leggi regionali, sempre indicati come tali e collegati al testo ufficiale. I dati su eletti, contatti e risultati non sono generati dall'AI: arrivano dalle fonti ufficiali con programmi automatici, e ogni dato rimanda alla sua fonte.",
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
      <section className="contenitore pt-12 pb-14 text-center sm:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          {comuni.length.toLocaleString("it-IT")} comuni in tutta Italia · dati aggiornati al {meta.generato.split("-").reverse().join("/")}
        </p>
        <h1 className="display mx-auto mt-5 max-w-4xl text-5xl sm:text-7xl">
          Chi mi <em className="text-accent">rappresenta</em>?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-ink-2 sm:text-lg">
          Dal sindaco al Parlamento europeo: scrivi il tuo comune e trovi tutte le persone elette per te, in una pagina, con le
          fonti ufficiali.
        </p>
        <div
          id="cerca"
          className="mx-auto mt-8 max-w-2xl scroll-mt-28 rounded-[24px] border border-line bg-surface p-3 text-left shadow-[0_30px_60px_-40px_rgba(20,34,31,0.45)]"
        >
          <ComuneSearch autoFocus />
        </div>
      </section>

      {/* COSA VUOI FARE: le quattro strade principali, chiare e grandi */}
      <section aria-labelledby="cosa-fare" className="contenitore pb-16">
        <h2 id="cosa-fare" className="display text-center text-3xl sm:text-4xl">
          Cosa vuoi fare?
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: "#cerca",
              icona: "👥",
              titolo: "Sapere chi mi rappresenta",
              testo: "Scrivi il tuo comune qui sopra.",
            },
            {
              href: "/a-chi-rivolgersi/",
              icona: "🧭",
              titolo: "Ho un problema: a chi mi rivolgo?",
              testo: "Una buca, la ASL, la pensione, il treno.",
            },
            {
              href: "/regione/",
              icona: "🏛️",
              titolo: "Conoscere la mia Regione",
              testo: "Presidente, giunta e consiglieri delle 20 regioni.",
            },
            {
              href: "/regione/campania/leggi/",
              icona: "📜",
              titolo: "Capire cosa decide la Regione",
              testo: "Le leggi spiegate in parole semplici (per ora in Campania).",
            },
            {
              href: "/chiedi-un-documento/",
              icona: "📄",
              titolo: "Chiedere un documento",
              testo: "Spese, contratti, controlli: ti prepariamo la richiesta.",
            },
            {
              href: "#cerca",
              icona: "🗳️",
              titolo: "Vedere come ha votato il mio comune",
              testo: "Risultati e affluenza, confrontati con la tua regione.",
            },
          ].map((x) => (
            <Link
              key={x.titolo}
              href={x.href}
              data-umami-event="home-cosa-vuoi-fare"
              data-umami-event-scelta={x.titolo}
              className="group flex items-center gap-4 rounded-[22px] border border-line bg-surface p-4 transition-colors hover:border-ink-3"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-2xl" aria-hidden>
                {x.icona}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{x.titolo}</span>
                <span className="block text-sm text-ink-3">{x.testo}</span>
              </span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-sm text-bg transition-transform group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* QUATTRO LIVELLI */}
      <section className="contenitore">
        <h2 className="display text-3xl sm:text-4xl">Quattro livelli, una pagina.</h2>
        <p className="mt-2 max-w-2xl text-ink-2">Ogni giorno qualcuno decide per te in Comune, in Regione, a Roma e a Bruxelles. Ecco chi.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {livelli.map((l, i) => {
            const Ill = ILLUSTRAZIONE[l.id];
            return (
              <div key={l.id} style={stileLivello(l.id)} className="puntini flex flex-col rounded-[28px] bg-[var(--lv-bg)] p-1.5">
                <div className="grid h-28 place-items-center">
                  <Ill className="h-20" />
                </div>
                <div className="flex-1 rounded-[22px] bg-surface p-4">
                  <p className="text-xs font-semibold tracking-wider text-[var(--lv)] uppercase">Livello {i + 1}</p>
                  <h3 className="display mt-1 text-2xl">{l.titolo}</h3>
                  <p className="mt-2 text-sm text-ink-2">{l.testo}</p>
                  <p className="mt-3 flex items-baseline gap-2 border-t border-line pt-3">
                    <span className="display text-2xl text-[var(--lv)]">{l.numero}</span>
                    <span className="text-sm text-ink-3">{l.unita} in Italia</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CONSIGLIO REGIONALE */}
      <section className="contenitore mt-16">
        <div className="grid items-center gap-8 rounded-[28px] border border-line bg-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[var(--lv-regione)] uppercase">Il primo Consiglio regionale in chiaro</p>
            <h2 className="display mt-2 text-3xl sm:text-4xl">Campania: {regione.consiglieri.length} consiglieri. Tocca un punto.</h2>
            <p className="mt-3 max-w-lg text-ink-2">
              Ogni punto è una persona, colorata per gruppo: apri la scheda per contatti, commissioni e atti. È il modello che
              vogliamo portare in tutte le regioni.
            </p>
            <Link href="/consigli-in-chiaro/" className="mt-2 inline-block text-sm font-semibold text-[var(--lv-regione)] underline">
              Le regioni in arrivo →
            </Link>
            <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
              <Link href="/regione/campania/attivita/" className="group rounded-2xl bg-[var(--lv-regione-bg)] p-4 hover:opacity-90">
                <span className="block text-sm text-ink-2">Atti presentati</span>
                <span className="display block text-4xl">{consiglio.atti.length}</span>
                <span className="text-sm font-medium text-[var(--lv-regione)] group-hover:underline">Cosa fanno →</span>
              </Link>
              <Link href="/regione/campania/leggi/" className="group rounded-2xl bg-[var(--lv-comune-bg)] p-4 hover:opacity-90">
                <span className="block text-sm text-ink-2">Leggi approvate</span>
                <span className="display block text-4xl">{consiglio.leggi.length}</span>
                <span className="text-sm font-medium text-[var(--lv-comune)] group-hover:underline">Spiegate semplici →</span>
              </Link>
            </div>
          </div>
          <Emiciclo consiglieri={consiglieriPerEmiciclo()} presidente={regione.presidente} gruppi={regione.gruppi} tipi={consiglio.tipi} />
        </div>
      </section>

      {/* FAQ */}
      <section className="contenitore mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div>
          <h2 className="display text-4xl text-ink-3 sm:text-6xl">Domande frequenti</h2>
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
              <summary className="flex items-center justify-between gap-4 py-3.5 font-medium">
                {f.d}
                <span className="chevron grid size-8 shrink-0 place-items-center rounded-full bg-surface text-ink-2 transition-transform" aria-hidden>
                  ›
                </span>
              </summary>
              <p className="pb-4 text-sm text-ink-2">{f.r}</p>
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
