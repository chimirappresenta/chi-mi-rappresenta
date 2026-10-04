import type { Metadata } from "next";
import Link from "next/link";
import { consiglio, fonte, regione } from "@/lib/data";
import { dataLunga, slugConsigliere } from "@/lib/format";
import { AttiFeed } from "@/components/AttiFeed";
import { SPIEGAZIONE_TIPI } from "@/components/consiglio";
import { FontiNote } from "@/components/ui";
import { IntestazioneRegione } from "@/components/IntestazioneRegione";
import { Segui } from "@/components/Segui";
import { stileLivello } from "@/components/ui";
import { SITE_URL } from "@/lib/sito";

export const metadata: Metadata = {
  title: "Cosa fanno i consiglieri regionali della Campania",
  description: "Interrogazioni, mozioni, proposte di legge e question time presentati dai consiglieri regionali della Campania.",
};

export default function AttivitaPage() {
  const classifica = regione.consiglieri
    .map((c) => ({ c, s: consiglio.attivita[c.username] }))
    .sort((a, b) => (b.s?.primoFirmatario ?? 0) - (a.s?.primoFirmatario ?? 0) || (b.s?.totale ?? 0) - (a.s?.totale ?? 0));

  return (
    <div className="contenitore py-8">
      <IntestazioneRegione
        titolo="Cosa fanno i consiglieri"
        intro={`Tutti gli atti presentati in Consiglio regionale dall'inizio della legislatura (${dataLunga(consiglio.inizio)}): ${consiglio.atti.length} in totale.`}
        attiva="attivita"
        condividi={{
          path: "/regione/campania/attivita/",
          testo: `${consiglio.atti.length} interrogazioni, mozioni e proposte di legge del Consiglio regionale della Campania, con chi le ha firmate. Cerca per tema o per comune.`,
        }}
      />

      {/* Su schermi larghi: atti a sinistra, spiegazioni e tabella per consigliere a destra */}
      <div className="mt-6 grid items-start gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section>
          <h2 className="text-lg font-semibold">Tutti gli atti</h2>
          <div className="mt-3">
            <AttiFeed atti={consiglio.atti} tipi={consiglio.tipi} />
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-4">
          <div style={stileLivello("regione")}>
            <Segui
              feed={`${SITE_URL}/regione/campania/feed.xml`}
              titolo="Segui il Consiglio regionale"
              testo="Ricevi un avviso per ogni nuovo atto dei consiglieri e ogni nuova legge regionale."
            />
          </div>
          <details className="rounded-2xl border border-line bg-surface" open>
            <summary className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-ink-2 hover:text-ink">
              Che differenza c&apos;è tra interrogazione, mozione, proposta di legge…?
              <span className="chevron text-ink-3 transition-transform" aria-hidden>
                ›
              </span>
            </summary>
            <dl className="space-y-2 border-t border-line px-4 py-3 text-sm">
              {consiglio.tipi.map((t) => (
                <div key={t.id}>
                  <dt className="inline font-semibold">{t.nome}: </dt>
                  <dd className="inline text-ink-2">{SPIEGAZIONE_TIPI[t.id]}</dd>
                </div>
              ))}
            </dl>
          </details>

          <section>
            <h2 className="text-lg font-semibold">Atti per consigliere</h2>
            <p className="mt-1 text-sm text-ink-3">
              Primo firmatario = chi ha scritto e presentato l&apos;atto; cofirmato = ha aggiunto la propria firma. Contare gli
              atti non misura la qualità del lavoro: chi è presidente di commissione, per esempio, ne presenta meno.
            </p>
            <div className="mt-3 max-h-[70vh] overflow-auto rounded-2xl border border-line bg-surface">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-line bg-surface text-left text-ink-3">
                  <tr>
                    <th className="px-4 py-2 font-medium">Consigliere</th>
                    <th className="px-4 py-2 font-medium">Prov.</th>
                    <th className="px-4 py-2 text-right font-medium" title="Primo firmatario">Presentati</th>
                    <th className="px-4 py-2 text-right font-medium">Firmati</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {classifica.map(({ c, s }) => (
                    <tr key={c.username}>
                      <td className="px-4 py-2">
                        <Link href={`/regione/campania/consiglieri/${slugConsigliere(c.username)}/`} className="hover:text-accent hover:underline">
                          {c.nome}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-ink-3">{c.circoscrizione ?? "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{s?.primoFirmatario ?? 0}</td>
                      <td className="px-4 py-2 text-right text-ink-3 tabular-nums">{s?.totale ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <FontiNote fonti={[fonte("cr-atti")]} />
          </div>
        </aside>
      </div>
    </div>
  );
}
