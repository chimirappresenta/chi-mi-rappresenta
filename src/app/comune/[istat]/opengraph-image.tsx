import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getComune, getRegioneEssenziale, parlamento, regione } from "@/lib/data";
import { OG_COLORI as C, OG_SIZE, OgEmiciclo, OgFrame, ogFonts } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-static";
export const alt = "Chi rappresenta questo comune, dal sindaco al Parlamento europeo";

export function generateStaticParams() {
  // nessuna alla build: si generano alla prima richiesta (social, lettori di feed) e restano in cache
  return [];
}

export default async function Image({ params }: { params: Promise<{ istat: string }> }) {
  const c = getComune((await params).istat);
  if (!c) notFound();
  const a = c.amministrazione;
  const circ = c.circoscrizioneRegionale;
  const reg = getRegioneEssenziale(c.codiceRegione);
  const inChiaro = !!reg?.inChiaro;
  const nCirc = inChiaro ? regione.consiglieri.filter((x) => x.circoscrizione === circ).length : 0;
  const deputati = (c.collegi?.cameraU ?? []).flatMap((k) => (parlamento.camera[k] ?? []).map((p) => p.nome));
  const senatori = (c.collegi?.senatoU ?? []).flatMap((k) => parlamento.senato.uninominali[k]?.nome ?? []);

  const righe: [string, string][] = [
    ["Comune", a?.tipo === "commissariata" ? "Commissariato" : a?.sindaco ? `Sindaco ${a.sindaco.nome}` : "Dati in aggiornamento"],
    ["Regione", inChiaro ? `${nCirc} consiglieri eletti in provincia` : reg?.presidente ? `Presidente ${reg.presidente.nome}` : c.regione],
    ["Camera", deputati.join(", ") || "—"],
    ["Senato", senatori.join(", ") || "—"],
  ];

  return new ImageResponse(
    (
      <OgFrame etichetta="Chi ti rappresenta">
        <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontFamily: "Instrument Serif", letterSpacing: -2, fontSize: c.nome.length > 18 ? 84 : 112, lineHeight: 1.05 }}>{c.nome}</div>
            <div style={{ fontSize: 28, color: C.ink2, marginTop: 8 }}>
              {c.capoluogo ? `Capoluogo di provincia · ${c.regione}` : `Provincia di ${c.provincia} · ${c.regione}`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 32, gap: 10 }}>
              {righe.map(([k, v]) => (
                <div key={k} style={{ display: "flex", fontSize: 26 }}>
                  <span style={{ width: 130, color: C.ink3 }}>{k}</span>
                  <span style={{ fontWeight: 600, flex: 1 }}>{v.length > 44 ? `${v.slice(0, 42)}…` : v}</span>
                </div>
              ))}
            </div>
          </div>
          {inChiaro && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <OgEmiciclo consiglieri={regione.consiglieri} gruppi={regione.gruppi} evidenzia={(x) => x.circoscrizione === circ} larghezza={420} />
            <div style={{ fontSize: 20, color: C.ink3, marginTop: 8 }}>Consiglio regionale · eletti in provincia</div>
          </div>
          )}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
