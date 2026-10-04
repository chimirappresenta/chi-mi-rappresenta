// Integrazioni per le regioni che mancano nell'anagrafe regionale del Ministero dell'Interno (oggi Marche e
// Trentino-Alto Adige): presidente, giunta e consiglieri letti dai siti ufficiali di Consiglio e Regione.
// Restituisce { [codiceRegione]: { presidente, giunta, consiglieri, fonte } }; se un sito cambia, la regione resta senza dati e la pipeline avvisa.

const decodifica = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&rsquo;|&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&([aeiou])grave;/g, (_, v) => ({ a: "à", e: "è", i: "ì", o: "ò", u: "ù" })[v])
    .replace(/&eacute;/g, "é")
    .replace(/\s+/g, " ")
    .trim();

const PARTICELLE = new Set(["de", "di", "da", "del", "della", "dal", "dalla", "la", "lo", "van", "von"]);
/** "Ruggeri Marta Carmela Raimonda" → "Marta Carmela Raimonda Ruggeri"; "De Angelis Mario" → "Mario De Angelis". */
function nomeCognome(s) {
  const p = s.split(" ");
  let n = 1;
  while (n < p.length - 1 && PARTICELLE.has(p[n - 1].toLowerCase())) n++;
  return [...p.slice(n), ...p.slice(0, n)].join(" ");
}

export async function integrazioniRegioni({ download, persona, warn }) {
  const out = {};

  // Marche: elenco dei consiglieri (con il presidente della Giunta) e degli assessori esterni.
  try {
    const url = "https://www.consiglio.marche.it/istituzione/consiglieri/";
    const buf = await download("cr-marche-consiglieri.html", url, { binary: true });
    const h = new TextDecoder("windows-1252").decode(buf);
    // i consiglieri sono elencati prima del titolo "Assessori"; dopo vengono gli assessori esterni
    const iA = h.indexOf(">Assessori<");
    const parteConsiglieri = iA < 0 ? h : h.slice(0, iA);
    const voci = [...parteConsiglieri.matchAll(/scheda\.php\?consigliere=\d+\s*"[^>]*>([^<]+)<\/a>([^<]*)/g)].map((m) => ({ nome: nomeCognome(decodifica(m[1])), nota: decodifica(m[2]) }));
    const presidente = voci.find((v) => /Presidente della Giunta/i.test(v.nota));
    const assessori = iA < 0 ? [] : [...h.slice(iA, h.indexOf("Contatti", iA)).matchAll(/>\s*([A-ZÀ-Ü][^<>]{3,60}?)\s*</g)].map((m) => decodifica(m[1])).filter((x) => x !== "Assessori" && !x.includes("-->"));
    if (!presidente || voci.length < 20) throw new Error("struttura della pagina cambiata");
    out["11"] = {
      presidente: persona({ nome: presidente.nome, ruolo: "Presidente della Regione", url }),
      giunta: assessori.map((a) => persona({ nome: nomeCognome(a), ruolo: "Assessore", url })),
      consiglieri: voci.filter((v) => v !== presidente).map((v) => persona({ nome: v.nome, ruolo: "Consigliere regionale", url })),
      fonte: { nome: "Consiglio regionale delle Marche", url },
    };
  } catch (e) {
    warn(`Marche: consiglieri non letti dal sito del Consiglio (${e.message})`);
  }

  // Trentino-Alto Adige: consiglieri (con il gruppo) dal Consiglio regionale, giunta dal sito della Regione.
  try {
    const url = "https://www.consiglio.regione.taa.it/it/consiglio/pagine/consiglieri";
    const h = await download("cr-taa-consiglieri.html", url);
    const consiglieri = [...h.matchAll(/<div class='h5 text-uppercase'>([^<]+)<\/div><p>([^<]*)<\/p><a href="([^"]+scheda-consigliere[^"]+)"/g)].map((m) =>
      persona({ nome: nomeCognome(decodifica(m[1])), ruolo: "Consigliere regionale", dettaglio: decodifica(m[2]) || undefined, url: m[3] }),
    );
    const urlG = "https://www.regione.taa.it/Amministrazione/Componenti-della-Giunta";
    const g = await download("regione-taa-giunta.html", urlG);
    const giuntaTutta = [...g.matchAll(/<h5 class="card-title[^"]*">\s*([^<]+?)\s*<\/h5>[\s\S]*?<li>\s*([^<]+?)\s*</g)].map((m) => ({ nome: decodifica(m[1]), ruolo: decodifica(m[2]) }));
    const pres = giuntaTutta.find((x) => /^Presidente$/i.test(x.ruolo));
    if (consiglieri.length < 50 || !pres) throw new Error("struttura della pagina cambiata");
    out["04"] = {
      presidente: persona({ nome: pres.nome, ruolo: "Presidente della Regione", url: urlG }),
      giunta: giuntaTutta
        .filter((x) => x !== pres)
        .map((x) => persona({ nome: x.nome, ruolo: /vice/i.test(x.ruolo) ? "Vicepresidente e assessore" : "Assessore", url: urlG })),
      consiglieri,
      fonte: { nome: "Consiglio regionale e Regione Trentino-Alto Adige", url },
    };
  } catch (e) {
    warn(`Trentino-Alto Adige: consiglieri non letti dai siti ufficiali (${e.message})`);
  }
  return out;
}
