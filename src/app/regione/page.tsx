import type { Metadata } from "next";
import { consiglieriPerEmiciclo, consiglio, fonte, regione } from "@/lib/data";
import { Gruppo, Livello, PersonaRow } from "@/components/ui";
import { Emiciclo } from "@/components/Emiciclo";
import { IntestazioneRegione } from "@/components/IntestazioneRegione";

export const metadata: Metadata = {
  title: "Giunta e Consiglio regionale della Campania",
  description: "Il Consiglio regionale della Campania in un emiciclo: cerca ogni consigliere per nome o gruppo e apri la sua scheda.",
};

export default function RegionePage() {
  return (
    <div className="contenitore py-8">
      <IntestazioneRegione
        titolo="Regione Campania"
        intro="Il Consiglio fa le leggi regionali e controlla la Giunta, che governa la Regione. I consiglieri sono eletti in cinque circoscrizioni, una per provincia."
        attiva="regione"
        condividi={{
          path: "/regione/",
          testo: "Il Consiglio regionale della Campania in un colpo d'occhio: tutti i consiglieri, i gruppi e i loro contatti.",
        }}
      />

      {/* Su schermi larghi: emiciclo a sinistra, Giunta a destra */}
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Livello
          id="regione"
          anchor="consiglio"
          numero={2}
          titolo="Consiglio regionale"
          sottotitolo="Ogni punto è un consigliere, colorato per gruppo: a sinistra la maggioranza, a destra l'opposizione."
          fonti={[fonte("cr"), fonte("cr-atti"), fonte("wiki-regionali")]}
        >
          <Emiciclo consiglieri={consiglieriPerEmiciclo()} presidente={regione.presidente} gruppi={regione.gruppi} tipi={consiglio.tipi} />
        </Livello>

        <Livello
          id="regione"
          anchor="giunta"
          numero={2}
          titolo="Giunta regionale"
          sottotitolo="Il presidente e gli assessori, ciascuno con le sue deleghe."
          fonti={[fonte("giunta"), fonte("cr")]}
        >
          {regione.presidente && (
            <Gruppo titolo="Presidente della Regione">
              <PersonaRow p={regione.presidente} evidenza />
            </Gruppo>
          )}
          <Gruppo titolo={`Assessori (${regione.giunta.length})`}>
            {regione.giunta.map((p) => (
              <PersonaRow key={p.nome} p={p} />
            ))}
          </Gruppo>
        </Livello>
      </div>
    </div>
  );
}
