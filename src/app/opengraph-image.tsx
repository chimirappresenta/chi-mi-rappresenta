import { ImageResponse } from "next/og";
import { comuni, regione } from "@/lib/data";
import { OG_COLORI as C, OG_SIZE, OgEmiciclo, OgFrame, ogFonts } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-static";
export const alt = "Chi mi rappresenta: scrivi il tuo comune e scopri chi ti rappresenta, dal Comune all'Europa";

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame etichetta="Campania · fonti ufficiali">
        <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontFamily: "Instrument Serif", letterSpacing: -2, fontSize: 96, lineHeight: 1 }}>Chi ti rappresenta, dal tuo Comune a Bruxelles.</div>
            <div style={{ fontSize: 30, color: C.ink2, marginTop: 20 }}>
              {`Sindaco, Regione, Parlamento ed Europa in una pagina, per ognuno dei ${comuni.length} comuni campani.`}
            </div>
          </div>
          <OgEmiciclo consiglieri={regione.consiglieri} gruppi={regione.gruppi} larghezza={400} />
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
