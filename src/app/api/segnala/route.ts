import type { NextRequest } from "next/server";
import { avvisaTelegram, html } from "@/lib/telegram";

// Crea una issue pubblica su GitHub con la segnalazione di un utente, come fa DoveVannoINostriSoldi.
// Il token resta sul server: l'utente non ha bisogno di un account GitHub.
// Variabili d'ambiente (su Vercel):
//   GITHUB_TOKEN_SEGNALAZIONI  token "classic" dell'account macchina (bot) con il solo permesso public_repo.
//                              Il bot NON è collaboratore del repository: può aprire issue (come chiunque su un
//                              repository pubblico) ma non modificare il codice. Le etichette vengono ignorate.
//   GITHUB_REPO_SEGNALAZIONI   "proprietario/repository"

export const dynamic = "force-dynamic";

const MAX = 2000;
// Limite semplice anti-abuso: poche segnalazioni per indirizzo in una finestra di tempo (per istanza del server).
const finestra = 10 * 60 * 1000;
const massimo = 5;
const invii = new Map<string, number[]>();

const testo = (v: unknown, max = MAX) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: NextRequest) {
  const token = process.env.GITHUB_TOKEN_SEGNALAZIONI;
  const repo = process.env.GITHUB_REPO_SEGNALAZIONI;
  if (!token || !repo) return Response.json({ errore: "Invio automatico non configurato" }, { status: 503 });

  let dati: Record<string, unknown>;
  try {
    dati = await request.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }

  // Campo trappola: se è compilato è un bot. Rispondiamo "ok" senza fare nulla.
  if (testo(dati.website)) return Response.json({ ok: true });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonimo";
  const ora = Date.now();
  const recenti = (invii.get(ip) ?? []).filter((t) => ora - t < finestra);
  if (recenti.length >= massimo) return Response.json({ errore: "Troppe segnalazioni, riprova più tardi" }, { status: 429 });
  invii.set(ip, [...recenti, ora]);

  const tipo = testo(dati.tipo, 80) || "Segnalazione";
  const cosa = testo(dati.cosa);
  if (cosa.length < 5) return Response.json({ errore: "Descrivi il problema" }, { status: 400 });
  const atteso = testo(dati.atteso);
  const fonte = testo(dati.fonte, 500);
  const ctx = (typeof dati.contesto === "object" && dati.contesto) || {};
  const c = (k: string, max = 300) => testo((ctx as Record<string, unknown>)[k], max);

  const titolo = `[${tipo}] ${c("sezione", 80) || c("pagina", 80)}: ${cosa.slice(0, 70)}${cosa.length > 70 ? "…" : ""}`;
  const corpo = [
    `**Tipo:** ${tipo}`,
    "",
    "### Cosa è stato notato",
    cosa,
    atteso ? `\n### Informazione corretta secondo chi segnala\n${atteso}` : null,
    fonte ? `\n**Fonte indicata:** ${fonte}` : null,
    "",
    "---",
    `Pagina: \`${c("pagina")}\` · ${c("titoloPagina")}`,
    `Sezione: ${c("sezione")}`,
    `Inviata: ${c("quando")} · schermo ${c("schermo", 20)}`,
    `Browser: ${c("browser")}`,
    "",
    "_Segnalazione inviata dal sito tramite il modulo \"Segnala un errore\". Nessun dato personale viene raccolto._",
  ]
    .filter((r) => r !== null)
    .join("\n");

  const r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "chi-mi-rappresenta",
    },
    // niente etichette: il bot non è collaboratore e non può assegnarle
    body: JSON.stringify({ title: titolo, body: corpo }),
  });
  // Avviso privato al gestore su Telegram: arriva anche se GitHub rifiuta, così la segnalazione non va persa.
  const avviso = (stato: string, url?: string) =>
    [
      `${stato} <b>${html(tipo)}</b> · ${html(c("sezione", 80) || c("pagina", 80))}`,
      "",
      html(cosa.slice(0, 1200)),
      ...(atteso ? [`<b>Informazione corretta secondo chi segnala:</b> ${html(atteso.slice(0, 600))}`] : []),
      ...(fonte ? [`<b>Fonte:</b> ${html(fonte)}`] : []),
      `<b>Pagina:</b> ${html(c("pagina"))}`,
      ...(url ? ["", `<a href="${html(url)}">Apri la segnalazione su GitHub</a>`] : []),
    ].join("\n");
  if (!r.ok) {
    // nei log di Vercel: stato e messaggio di GitHub (mai il token)
    console.error(`Segnalazione rifiutata da GitHub: ${r.status} ${(await r.text()).slice(0, 300)}`);
    await avvisaTelegram(avviso("⚠️ Segnalazione NON salvata su GitHub (errore " + r.status + "):"));
    return Response.json({ errore: "Invio non riuscito" }, { status: 502 });
  }
  const issue = (await r.json()) as { html_url?: string };
  await avvisaTelegram(avviso("🆕 Nuova segnalazione:", issue.html_url));
  return Response.json({ ok: true, url: issue.html_url });
}
