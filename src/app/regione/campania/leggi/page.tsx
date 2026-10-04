import type { Metadata } from "next";
import { consiglio, fonte } from "@/lib/data";
import { dataLunga } from "@/lib/format";
import { LeggeCard } from "@/components/consiglio";
import { FontiNote } from "@/components/ui";
import { IntestazioneRegione } from "@/components/IntestazioneRegione";

export const metadata: Metadata = {
  title: "Leggi regionali della Campania",
  description: "Le leggi approvate dal Consiglio regionale della Campania nella legislatura in corso, spiegate in parole semplici.",
};

export default function LeggiPage() {
  const conRiassunto = consiglio.leggi.filter((l) => l.riassunto).length;
  return (
    <div className="contenitore py-8">
      <IntestazioneRegione
        titolo="Leggi approvate"
        intro={`Le ${consiglio.leggi.length} leggi regionali approvate dal ${dataLunga(consiglio.inizio)}, dalla più recente.${
          conRiassunto > 0 ? " Per ognuna, un riassunto in parole semplici e il testo ufficiale." : ""
        }`}
        attiva="leggi"
        condividi={{
          path: "/regione/campania/leggi/",
          testo: "Le leggi approvate dalla Regione Campania, spiegate in parole semplici e con il testo ufficiale.",
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
        <FontiNote fonti={[fonte("cr-atti")]} />
      </div>
    </div>
  );
}
