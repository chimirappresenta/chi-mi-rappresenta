import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { attiDi, consiglio, fonte, getConsigliere, regione } from "@/lib/data";
import { AttiFeed } from "@/components/AttiFeed";
import { Gruppo, FontiNote, PersonaRow } from "@/components/ui";
import { IntestazioneRegione } from "@/components/IntestazioneRegione";
import { ScriviA } from "@/components/ScriviA";
import { slugConsigliere } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return regione.consiglieri.map((c) => ({ slug: slugConsigliere(c.username) }));
}

export async function generateMetadata({ params }: PageProps<"/regione/consiglieri/[slug]">): Promise<Metadata> {
  const c = getConsigliere((await params).slug);
  return c
    ? {
        title: `${c.nome}, consigliere regionale`,
        description: `Contatti, commissioni e atti presentati in Consiglio regionale della Campania da ${c.nome}.`,
      }
    : {};
}

export default async function ConsiglierePage({ params }: PageProps<"/regione/consiglieri/[slug]">) {
  const c = getConsigliere((await params).slug);
  if (!c) notFound();

  const atti = attiDi(c.username);
  const s = consiglio.attivita[c.username];

  const g = regione.gruppi.find((x) => x.nome === c.gruppo);

  return (
    <div className="contenitore py-8">
      <IntestazioneRegione
        titolo={c.nome}
        sottotitolo={`Consigliere regionale${c.circoscrizione ? ` · eletto nella circoscrizione di ${c.circoscrizione}` : " · subentrato dopo le elezioni"}`}
        intro={g ? `${g.nome}${c.ruoloGruppo ? ` (${c.ruoloGruppo})` : ""} · ${g.coalizione}` : (c.gruppo ?? "")}
        attiva={null}
        indietro={{ href: "/regione/", label: "Giunta e Consiglio regionale" }}
        condividi={{
          path: `/regione/consiglieri/${slugConsigliere(c.username)}/`,
          testo: `${c.nome}, consigliere regionale della Campania${g ? ` (${g.sigla})` : ""}: contatti e ${s?.primoFirmatario ?? 0} atti presentati in Consiglio regionale.`,
        }}
      />

      {/* Su schermi larghi: contatti e numeri a sinistra (fissi), atti a destra */}
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <aside className="space-y-4 lg:sticky lg:top-4">
          <Gruppo titolo="Contatti e incarichi">
            <PersonaRow p={c} />
          </Gruppo>
          <ScriviA nome={c.nome} tipo="consigliere-regionale" email={c.email} pec={c.pec} />
          {s && (
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-line bg-surface p-3">
                <dt className="text-xs text-ink-3">Come primo firmatario</dt>
                <dd className="display text-5xl tabular-nums">{s.primoFirmatario}</dd>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-3">
                <dt className="text-xs text-ink-3">Firmati in totale</dt>
                <dd className="display text-5xl tabular-nums">{s.totale}</dd>
              </div>
              {consiglio.tipi
                .filter((t) => s.perTipo[t.id])
                .map((t) => (
                  <div key={t.id} className="rounded-2xl border border-line bg-surface p-3">
                    <dt className="text-xs text-ink-3">{t.plurale}</dt>
                    <dd className="display text-4xl tabular-nums">{s.perTipo[t.id]}</dd>
                  </div>
                ))}
            </dl>
          )}
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <FontiNote fonti={[fonte("cr"), fonte("cr-atti")]} />
          </div>
        </aside>

        <section>
          <h2 className="text-xl font-semibold">Atti firmati</h2>
          {atti.length > 0 ? (
            <div className="mt-3">
              <AttiFeed atti={atti} tipi={consiglio.tipi.filter((t) => s?.perTipo[t.id])} />
            </div>
          ) : (
            <p className="mt-2 text-ink-3">Nessun atto firmato finora in questa legislatura.</p>
          )}
        </section>
      </div>
    </div>
  );
}
