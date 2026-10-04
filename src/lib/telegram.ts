import "server-only";

// Avvisi privati al gestore del sito su Telegram (nuove segnalazioni degli utenti).
// Variabili d'ambiente (su Vercel): TELEGRAM_BOT_TOKEN (dal BotFather) e TELEGRAM_CHAT_ID (la chat del gestore).
// Senza le variabili non succede nulla; un errore di Telegram non deve mai bloccare il sito.

/** Testo sicuro per i messaggi in HTML di Telegram. */
export const html = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function avvisaTelegram(testoHtml: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: testoHtml.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true }),
      // la segnalazione dell'utente è già salvata: non lo facciamo aspettare per l'avviso
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) console.error(`Avviso Telegram non inviato: ${r.status}`);
  } catch {
    console.error("Avviso Telegram non inviato (rete o tempo scaduto)");
  }
}
