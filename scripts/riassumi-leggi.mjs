// Riassunti in linguaggio semplice delle leggi regionali, generati con Claude dal PDF ufficiale.
// Uso: node scripts/riassumi-leggi.mjs   (dopo `npm run data`)
// Richiede credenziali Anthropic (ANTHROPIC_API_KEY o un profilo `ant auth login`).
// I riassunti vengono salvati in data/manual/riassunti/<regione>.json: ogni legge è riassunta una sola volta,
// e il file si può rivedere e correggere a mano. Al prossimo `npm run data` finiscono nel sito.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW = path.join(ROOT, "data", "raw");
const CARTELLA = path.join(ROOT, "data", "manual", "riassunti");
const CONSIGLI = path.join(ROOT, "src", "data", "consigli.json");
const MODELLO = "claude-opus-5-5";

const system = (regione) => `Riassumi leggi della Regione ${regione} per cittadini senza formazione giuridica.
Scrivi in italiano semplice, 2-4 frasi, al massimo 90 parole. Spiega cosa fa la legge in concreto, per chi e, se il testo li indica, con quali soldi o tempi.
Usa solo quello che c'è nel documento: niente opinioni, niente previsioni, niente informazioni esterne. Se la legge è tecnica (per esempio un riconoscimento di debito fuori bilancio o una modifica di bilancio), dillo in modo chiaro e breve.
Rispondi solo con il riassunto, senza titoli, elenchi o premesse.`;

// Un file di riassunti per ogni Consiglio in chiaro.
const caches = {};
const daFare = [];
for (const { slug, nome, consiglio } of Object.values(JSON.parse(fs.readFileSync(CONSIGLI, "utf8")))) {
  const file = path.join(CARTELLA, `${slug}.json`);
  const cache = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  cache._nota ??=
    "Riassunti generati automaticamente dal testo ufficiale delle leggi con Claude. Si possono correggere a mano: la pipeline non li sovrascrive.";
  cache.leggi ??= {};
  caches[slug] = { file, cache };
  for (const legge of consiglio.leggi) if (legge.pdf && !cache.leggi[legge.id]) daFare.push({ slug, nome, legge });
}
if (daFare.length === 0) {
  console.log("Tutte le leggi hanno già un riassunto.");
  process.exit(0);
}

const client = new Anthropic();

for (const { slug, nome, legge } of daFare) {
  const { file, cache } = caches[slug];
  // I PDF della Campania hanno il nome storico senza regione.
  const pdfFile = path.join(RAW, slug === "campania" ? `legge-${legge.id}.pdf` : `legge-${slug}-${legge.id}.pdf`);
  if (!fs.existsSync(pdfFile)) {
    const res = await fetch(legge.pdf, { headers: { "User-Agent": "chi-mi-rappresenta/0.1" } });
    if (!res.ok) {
      console.warn(`  ! ${legge.intestazione}: PDF non scaricabile (HTTP ${res.status})`);
      continue;
    }
    fs.writeFileSync(pdfFile, Buffer.from(await res.arrayBuffer()));
  }
  const data = fs.readFileSync(pdfFile).toString("base64");

  try {
    const response = await client.beta.messages.create({
      model: MODELLO,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      // Se il modello rifiuta per un falso positivo dei filtri di sicurezza, il server riprova su un altro modello.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: system(nome),
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
            { type: "text", text: `Riassumi la ${legge.intestazione}.` },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      console.warn(`  ! ${legge.intestazione}: richiesta rifiutata (${response.stop_details?.category ?? "n.d."})`);
      continue;
    }
    const testo = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!testo) {
      console.warn(`  ! ${legge.intestazione}: risposta vuota (${response.stop_reason})`);
      continue;
    }
    cache.leggi[legge.id] = { testo, modello: response.model, generato: new Date().toISOString().slice(0, 10) };
    fs.mkdirSync(CARTELLA, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(cache, null, 2));
    console.log(`  ✓ ${legge.intestazione}`);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("Credenziali Anthropic non valide: controlla ANTHROPIC_API_KEY.");
      process.exit(1);
    } else if (err instanceof Anthropic.RateLimitError) {
      console.warn("  ! Limite di richieste raggiunto: riprova più tardi, i riassunti già fatti sono salvati.");
      break;
    } else if (err instanceof Anthropic.APIError) {
      console.warn(`  ! ${legge.intestazione}: errore API ${err.status}: ${err.message}`);
    } else {
      // Errore lato client, di solito credenziali mancanti: inutile proseguire con le altre leggi.
      console.error(`Impossibile chiamare l'API (${err.message}). Imposta ANTHROPIC_API_KEY o usa \`ant auth login\`.`);
      process.exit(1);
    }
  }
}
console.log("Fatto. Esegui `npm run data` per pubblicare i riassunti nel sito.");
