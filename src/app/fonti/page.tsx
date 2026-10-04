import type { Metadata } from "next";
import Link from "next/link";
import { meta } from "@/lib/data";

export const metadata: Metadata = { title: "Fonti e limiti" };

export default function FontiPage() {
  return (
    <div className="contenitore py-10">
      <h1 className="display text-4xl sm:text-5xl">
        Fonti e limiti
      </h1>
      <p className="mt-3 max-w-3xl text-base text-ink-2">
        Dati raccolti il {meta.generato.split("-").reverse().join("/")}. Ogni
        persona rimanda alla sua scheda ufficiale: se trovi una differenza, vale
        la fonte.
      </p>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Da dove vengono i dati</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
            {meta.fonti.map((f) => (
              <li key={f.id} className="px-4 py-3">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-accent hover:underline"
                >
                  {f.nome} ↗
                </a>
                <p className="text-sm text-ink-3">
                  {f.ente}
                  {f.aggiornato && ` · la fonte è aggiornata al ${f.aggiornato}`}
                  {f.raccolto && ` · scaricata da noi il ${f.raccolto.split("-").reverse().join("/")}`}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Limiti da conoscere</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-2">
            <li>
              <strong>Amministratori comunali:</strong> l&apos;anagrafe del
              Ministero dell&apos;Interno viene aggiornata dai Comuni e dalle
              Prefetture e può avere qualche settimana di ritardo (dimissioni,
              surroghe, nuove nomine in giunta).
            </li>
            <li>
              <strong>Collegi elettorali:</strong> sono quelli in vigore dal
              2020 (D.Lgs. 177/2020), usati alle politiche del 2022. Nei comuni
              divisi tra più collegi, come Napoli, il collegio giusto dipende
              dalla sezione elettorale.
            </li>
            <li>
              <strong>Regioni:</strong> presidenti, giunte e consiglieri delle
              altre regioni vengono dall&apos;anagrafe degli amministratori
              regionali del Ministero dell&apos;Interno, che dopo un&apos;elezione
              recente può essere incompleta. Per Trentino-Alto Adige e Marche,
              che oggi mancano nell&apos;anagrafe, leggiamo i nomi dai siti
              ufficiali di Consiglio e Regione.
            </li>
            <li>
              <strong>Risultati delle comunali:</strong> dal Ministero
              dell&apos;Interno e, per il Friuli-Venezia Giulia, dal portale open
              data della Regione. Per Sicilia, Trentino-Alto Adige e Valle
              d&apos;Aosta le elezioni comunali sono gestite dalle Regioni e non
              sono ancora disponibili in formato aperto: arriveranno più avanti.
            </li>
            <li>
              <strong>Comuni della Sardegna:</strong> dopo il riordino delle
              province alcune fonti usano i nuovi codici e le nuove sigle;
              abbiniamo i comuni con il codice catastale, che non cambia.
            </li>
            <li>
              <strong>Consiglieri regionali della Campania:</strong> la circoscrizione di
              elezione non è pubblicata dal Consiglio regionale in formato
              aperto. L&apos;abbiamo ricavata dai risultati delle regionali 2025
              e verificata a mano. Per i consiglieri subentrati dopo le elezioni
              è segnata come &quot;da verificare&quot;.
            </li>
            <li>
              <strong>Senato:</strong> gli open data indicano la regione di
              elezione ma non il collegio uninominale. L&apos;abbinamento
              collegio → senatore è ricavato dai risultati delle politiche
              2022 del Ministero dell&apos;Interno e confrontato con i senatori
              in carica (cambi di nome, elezioni suppletive come quella di
              Monza). Le email vengono dalle schede ufficiali del Senato.
            </li>
            <li>
              <strong>Atti del Consiglio regionale (Campania):</strong> sono quelli
              elencati sul sito del Consiglio per la XII legislatura. Contare
              gli atti di un consigliere non misura la qualità del suo lavoro.
              Gli atti &quot;che citano il tuo comune&quot; sono trovati
              cercando il nome del comune nel titolo: un atto può riguardarlo
              senza nominarlo.
            </li>
            <li>
              <strong>Intelligenza artificiale:</strong> il sito e i programmi
              che raccolgono i dati sono stati scritti con l&apos;aiuto
              dell&apos;AI. I dati invece (eletti, contatti, risultati) non
              sono generati dall&apos;AI: vengono letti dalle fonti ufficiali
              elencate qui sopra.
            </li>
            <li>
              <strong>Riassunti delle leggi:</strong> sono generati con un
              modello di intelligenza artificiale (Claude) a partire dal PDF
              ufficiale, e indicati come tali. Per le leggi di bilancio, molto
              lunghe, il riassunto si basa sugli articoli e non sulle tabelle
              allegate. Possono contenere imprecisioni: fa fede il testo della
              legge, sempre linkato.
            </li>
            <li>
              <strong>Eurodeputati:</strong> l&apos;API del Parlamento europeo
              non indica la circoscrizione: l&apos;abbinamento viene dagli
              eletti del 2024 (esclusi rinunce e opzioni) e dai subentri. A ogni
              aggiornamento controlliamo con l&apos;API che siano ancora in
              carica e che non ne manchi nessuno.
            </li>
          </ul>

          {meta.avvisi.length > 0 && (
            <>
              <h2 className="mt-10 text-lg font-semibold">
                Segnalazioni dell&apos;ultimo aggiornamento
              </h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-3">
                {meta.avvisi.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section id="privacy" aria-labelledby="titolo-privacy" className="mt-14 max-w-3xl scroll-mt-24">
        <h2 id="titolo-privacy" className="display text-3xl sm:text-4xl">
          Privacy e statistiche
        </h2>
        <p className="mt-3 text-base text-ink-2">
          Contiamo le visite in forma <strong>anonima</strong> con{" "}
          <a href="https://umami.is" target="_blank" rel="noreferrer" className="text-accent underline">
            Umami
          </a>
          , senza cookie e senza raccogliere dati personali: sappiamo quante persone visitano le pagine, da quale sito arrivano e
          quali pulsanti usano (per esempio &quot;Scrivi a…&quot; o &quot;Condividi&quot;), mai chi sono. Se il tuo browser chiede di
          non essere tracciato (&quot;Do Not Track&quot;), non contiamo nemmeno la tua visita.
        </p>
        <p className="mt-3 text-base text-ink-2">
          I messaggi che prepari con &quot;Scrivi a…&quot;, &quot;Chiedi un documento&quot; e &quot;Prepara la segnalazione&quot;
          restano sul tuo dispositivo: li invii tu dalla tua email. Le segnalazioni di errori diventano pubbliche su GitHub e non
          contengono dati personali. Tutti i dettagli nella pagina{" "}
          <Link href="/privacy/" className="text-accent underline">
            Privacy
          </Link>
          .
        </p>
        <p className="mt-3 text-base text-ink-2">
          <strong>Licenze:</strong> i dati restano soggetti alle licenze delle fonti. Gli open data di ISTAT, AgID (IPA), Camera e
          Senato sono rilasciati con licenze Creative Commons Attribuzione; i dati pubblicati dalle amministrazioni senza una licenza
          esplicita sono riutilizzabili come dati aperti (art. 52 del Codice dell&apos;amministrazione digitale). I CAP vengono da
          Wikidata (CC0); la circoscrizione dei consiglieri regionali e degli eurodeputati è ricavata da{" "}
          <a href="https://it.wikipedia.org" target="_blank" rel="noreferrer" className="text-accent underline">
            Wikipedia
          </a>{" "}
          (testi con licenza{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.it" target="_blank" rel="noreferrer" className="text-accent underline">
            CC BY-SA 4.0
          </a>
          ), verificata a mano.
        </p>
      </section>

      <section id="ispirazioni" aria-labelledby="titolo-ispirazioni" className="mt-14 scroll-mt-24">
        <h2 id="titolo-ispirazioni" className="display text-3xl sm:text-4xl">
          Ringraziamenti e ispirazioni
        </h2>
        <p className="mt-2 max-w-3xl text-base text-ink-2">
          Chi mi rappresenta non nasce dal nulla: prende spunto da progetti che rendono i dati pubblici più facili da usare, e li
          completa invece di sostituirli.
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {ISPIRAZIONI.map((x) => (
            <li key={x.nome} className="rounded-3xl border border-line bg-surface p-5">
              <a href={x.url} target="_blank" rel="noreferrer" className="text-lg font-semibold text-accent hover:underline">
                {x.nome} ↗
              </a>
              <p className="mt-1 text-base text-ink-2">{x.testo}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const ISPIRAZIONI = [
  {
    nome: "DoveVannoINostriSoldi",
    url: "https://www.dovevannoinostrisoldi.com",
    testo:
      "La nostra ispirazione principale: spesa pubblica, conti dei Comuni e politica nazionale raccontati con i dati ufficiali. Da loro abbiamo ripreso l'idea dell'emiciclo da esplorare e delle segnalazioni pubbliche degli errori. Per soldi pubblici e attività dei parlamentari rimandiamo a loro.",
  },
  {
    nome: "Italia Aperta",
    url: "https://www.italiaaperta.it",
    testo: "L'idea di portare in Italia i servizi pubblici spiegati in modo semplice, sul modello di USA.gov, e uno stile chiaro e moderno.",
  },
  {
    nome: "WriteToThem e Find your representative",
    url: "https://www.writetothem.com",
    testo: "I servizi del Regno Unito e degli Stati Uniti che, partendo da dove abiti, ti dicono chi sono i tuoi eletti e ti aiutano a scrivergli.",
  },
  {
    nome: "FragDenStaat e WhatDoTheyKnow",
    url: "https://fragdenstaat.de",
    testo: "In Germania e nel Regno Unito aiutano chiunque a chiedere documenti alla pubblica amministrazione: da qui nasce \"Chiedi un documento\".",
  },
];
