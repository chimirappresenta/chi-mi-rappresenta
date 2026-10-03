import { ImageResponse } from "next/og";
import { consiglio, getConsigliere, regione } from "@/lib/data";
import { slugConsigliere } from "@/lib/format";
import { OG_COLORI as C, OG_SIZE, OgEmiciclo, OgFrame, ogFonts } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-static";
export const alt = "Scheda del consigliere regionale: gruppo, contatti e atti presentati";

export function generateStaticParams() {
  return regione.consiglieri.map((c) => ({ slug: slugConsigliere(c.username) }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const c = getConsigliere((await params).slug)!;
  const g = regione.gruppi.find((x) => x.nome === c.gruppo);
  const s = consiglio.attivita[c.username];

  return new ImageResponse(
    (
      <OgFrame etichetta="Consiglio regionale della Campania">
        <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, fontWeight: 600, color: C.ink2 }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: g?.colore ?? C.ink3 }} />
              {g?.sigla ?? c.gruppo}
              {c.ruoloGruppo ? ` · ${c.ruoloGruppo}` : ""}
            </div>
            <div style={{ fontFamily: "Instrument Serif", letterSpacing: -2, fontSize: c.nome.length > 20 ? 80 : 100, lineHeight: 1.05, marginTop: 12 }}>{c.nome}</div>
            <div style={{ fontSize: 28, color: C.ink2, marginTop: 8 }}>
              {c.circoscrizione ? `Eletto in provincia di ${c.circoscrizione}` : "Consigliere regionale"}
            </div>
            <div style={{ display: "flex", gap: 40, marginTop: 36 }}>
              {[
                [s?.primoFirmatario ?? 0, "atti presentati"],
                [s?.totale ?? 0, "firmati in totale"],
              ].map(([n, l]) => (
                <div key={String(l)} style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontFamily: "Instrument Serif", letterSpacing: -2, fontSize: 92, lineHeight: 1 }}>{n}</span>
                  <span style={{ fontSize: 24, color: C.ink3 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <OgEmiciclo consiglieri={regione.consiglieri} gruppi={regione.gruppi} evidenzia={(x) => x.username === c.username} larghezza={420} />
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
