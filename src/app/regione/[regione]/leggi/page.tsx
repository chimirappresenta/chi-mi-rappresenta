import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { consigliInChiaro, getConsiglio } from "@/lib/data";
import { dataLunga, dellaRegione } from "@/lib/format";
import { LeggeCard } from "@/components/consiglio";
import { FontiNote } from "@/components/ui";
import { IntestazioneRegione } from "@/components/IntestazioneRegione";

export const dynamicParams = false;

export function generateStaticParams() {
  return consigliInChiaro.map((cr) => ({ regione: cr.slug }));
}

export async function generateMetadata({ params }: PageProps<"/regione/[regione]/leggi">): Promise<Metadata> {
  const cr = getConsiglio((await params).regione);
  return cr
    ? {
        title: `Leggi regionali ${dellaRegione(cr.nome)}`,
        description: `Le leggi approvate dal Consiglio regionale ${dellaRegione(cr.nome)} nella legislatura in corso, spiegate in parole semplici.`,
      }
    : {};
}

export default async function LeggiPage({ params }: PageProps<"/regione/[regione]/leggi">) {
  const cr = getConsiglio((await params).regione);
  if (!cr) notFound();
  const { consiglio } = cr;
  const conRiassunto = consiglio.leggi.filter((l) => l.riassunto).length;
  return (
    <div className="contenitore py-8">
      <IntestazioneRegione
        regione={cr.slug}
        titolo="Leggi approvate"
        intro={`Le ${consiglio.leggi.length} leggi regionali approvate dal ${dataLunga(consiglio.inizio)}, dalla più recente.${
          conRiassunto > 0 ? " Per ognuna, un riassunto in parole semplici e il testo ufficiale." : ""
        }`}
        attiva="leggi"
        condividi={{
          path: `/regione/${cr.slug}/leggi/`,
          testo: `Le leggi approvate dalla Regione ${cr.nome}, spiegate in parole semplici e con il testo ufficiale.`,
        }}
      />
      <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {consiglio.leggi.map((l) => (
          <div key={l.id} className="rounded-[28px] border border-line bg-surface p-1">
            <LeggeCard legge={l} />
          </div>
        ))}
      </div>
      <div className="mt-6">
        <FontiNote fonti={[cr.fonti.atti]} />
      </div>
    </div>
  );
}
