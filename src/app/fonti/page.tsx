import type { Metadata } from "next";
import { meta } from "@/lib/data";

export const metadata: Metadata = { title: "Fonti e limiti" };

export default function FontiPage() {
  return (
    <div className="contenitore py-10">
      <h1 className="display text-6xl sm:text-7xl">
        Fonti e limiti
      </h1>
      <p className="mt-3 max-w-3xl text-lg text-ink-2">
        Dati raccolti il {meta.generato.split("-").reverse().join("/")}. Ogni
        persona rimanda alla sua scheda ufficiale: se trovi una differenza, vale
        la fonte.
      </p>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">Da dove vengono i dati</h2>
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
          <h2 className="text-xl font-semibold">Limiti da conoscere</h2>
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
              <strong>Consiglieri regionali:</strong> la circoscrizione di
              elezione non è pubblicata dal Consiglio regionale in formato
              aperto. L&apos;abbiamo ricavata dai risultati delle regionali 2025
              e verificata a mano. Per i consiglieri subentrati dopo le elezioni
              è segnata come &quot;da verificare&quot;.
            </li>
            <li>
              <strong>Senato:</strong> gli open data indicano la regione di
              elezione ma non il collegio uninominale. L&apos;abbinamento
              collegio → senatore è stato verificato a mano.
            </li>
            <li>
              <strong>Atti del Consiglio regionale:</strong> sono quelli
              elencati sul sito del Consiglio per la XII legislatura. Contare
              gli atti di un consigliere non misura la qualità del suo lavoro.
              Gli atti &quot;che citano il tuo comune&quot; sono trovati
              cercando il nome del comune nel titolo: un atto può riguardarlo
              senza nominarlo.
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
              <strong>Eurodeputati:</strong> l&apos;elenco della circoscrizione
              è curato a mano. Ad ogni aggiornamento controlliamo con l&apos;API
              del Parlamento europeo che siano ancora in carica.
            </li>
          </ul>

          {meta.avvisi.length > 0 && (
            <>
              <h2 className="mt-10 text-xl font-semibold">
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
    </div>
  );
}
