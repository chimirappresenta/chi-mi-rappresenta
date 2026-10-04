// Avvisi privati su Telegram dalle automazioni di GitHub (aggiornamento del lunedì, segnalazioni aperte su GitHub).
// Uso:
//   node scripts/avviso-telegram.mjs aggiornamento-ok <meta-prima.json> <dati-cambiati: si|no>
//   node scripts/avviso-telegram.mjs aggiornamento-errore
//   node scripts/avviso-telegram.mjs segnalazione        (titolo, autore e link dalle variabili ISSUE_*)
// Variabili: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (secrets del repository), RUN_URL (link al registro dell'esecuzione).
// Senza token o chat non fa nulla.

import fs from "node:fs";

const token = process.env.TELEGRAM_BOT_TOKEN;
const chat = process.env.TELEGRAM_CHAT_ID;
const html = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const elenco = (voci, max = 10) =>
  voci
    .slice(0, max)
    .map((v) => `• ${html(v)}`)
    .join("\n") + (voci.length > max ? `\n• … e altri ${voci.length - max}` : "");

async function invia(testo) {
  if (!token || !chat) {
    console.log("Telegram non configurato: nessun avviso inviato.");
    return;
  }
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: testo.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!r.ok) {
    console.error(`Avviso Telegram non inviato: ${r.status} ${await r.text()}`);
    process.exitCode = 1;
  }
}

const [tipo, metaPrimaFile, cambiati] = process.argv.slice(2);
const runUrl = process.env.RUN_URL;

if (tipo === "aggiornamento-errore") {
  await invia(
    [
      "🔴 <b>Aggiornamento dati fallito</b>",
      "",
      "Il sito resta online con i dati della settimana scorsa. Serve un intervento: chiedi a Claude di controllare.",
      runUrl ? `\n<a href="${html(runUrl)}">Registro dell'errore</a>` : "",
    ].join("\n"),
  );
} else if (tipo === "aggiornamento-ok") {
  const meta = JSON.parse(fs.readFileSync("src/data/meta.json", "utf8"));
  let prima = {};
  try {
    prima = JSON.parse(fs.readFileSync(metaPrimaFile, "utf8"));
  } catch {
    // primo aggiornamento: nessun confronto
  }
  // solo gli avvisi nuovi rispetto alla settimana prima: quelli noti non si ripetono ogni lunedì
  const giaNoti = new Set(prima.avvisi ?? []);
  const nuovi = (meta.avvisi ?? []).filter((a) => !giaNoti.has(a));
  const leggi = meta.leggiSenzaRiassunto ?? [];
  const righe = [cambiati === "si" ? "✅ <b>Dati aggiornati</b>: il sito si ripubblica da solo in qualche minuto." : "✅ <b>Aggiornamento fatto</b>: nessun dato cambiato."];
  if (leggi.length)
    righe.push("", `🟡 <b>${leggi.length} ${leggi.length === 1 ? "legge regionale" : "leggi regionali"} da riassumere</b>`, elenco(leggi.map((l) => l.intestazione)), "Chiedi a Claude: «scrivi i riassunti delle leggi nuove».");
  if (nuovi.length) righe.push("", `🟡 <b>Avvisi nuovi da controllare</b>`, elenco(nuovi, 8));
  if (runUrl) righe.push("", `<a href="${html(runUrl)}">Dettagli</a>`);
  await invia(righe.join("\n"));
} else if (tipo === "segnalazione") {
  await invia(
    [
      "🆕 <b>Nuova segnalazione su GitHub</b>",
      "",
      `<b>${html(process.env.ISSUE_TITOLO)}</b>`,
      `da ${html(process.env.ISSUE_AUTORE)}`,
      "",
      html((process.env.ISSUE_TESTO ?? "").slice(0, 1200)),
      "",
      `<a href="${html(process.env.ISSUE_URL)}">Apri la segnalazione</a>`,
    ].join("\n"),
  );
} else {
  console.error(`Tipo di avviso sconosciuto: ${tipo}`);
  process.exitCode = 1;
}
