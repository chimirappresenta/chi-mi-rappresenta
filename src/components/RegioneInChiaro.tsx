import { consiglieriPerEmiciclo } from "@/lib/data";
import type { ConsiglioInChiaro } from "@/lib/types";
import { Gruppo, Livello, PersonaRow } from "@/components/ui";
import { Emiciclo } from "@/components/Emiciclo";
import { IntestazioneRegione } from "@/components/IntestazioneRegione";

/** Pagina principale di una regione "in chiaro": il Consiglio come emiciclo e la Giunta. */
export function RegioneInChiaro({ cr }: { cr: ConsiglioInChiaro }) {
  const { regione, consiglio, fonti } = cr;
  return (
    <div className="contenitore py-8">
      <IntestazioneRegione
        regione={cr.slug}
        titolo={`Regione ${cr.nome}`}
        intro={`Il Consiglio fa le leggi regionali e controlla la Giunta, che governa la Regione.${cr.elezione ? ` ${cr.elezione}` : ""}`}
        attiva="regione"
        condividi={{
          path: `/regione/${cr.slug}/`,
          testo: `Il Consiglio regionale della ${cr.nome} in un colpo d'occhio: tutti i consiglieri, i gruppi e i loro contatti.`,
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
          fonti={[fonti.consiglieri, fonti.atti, ...(fonti.circoscrizioni ? [fonti.circoscrizioni] : [])]}
        >
          <Emiciclo
            regione={{ slug: cr.slug, nome: cr.nome }}
            consiglieri={consiglieriPerEmiciclo(cr)}
            presidente={regione.presidente}
            gruppi={regione.gruppi}
            tipi={consiglio.tipi}
          />
        </Livello>

        <Livello
          id="regione"
          anchor="giunta"
          numero={2}
          titolo="Giunta regionale"
          sottotitolo="Il presidente e gli assessori, ciascuno con le sue deleghe."
          fonti={[fonti.giunta, fonti.consiglieri]}
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
