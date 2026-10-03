// Lettore minimo di file .xlsx (solo il primo foglio, solo valori): ci basta per gli open data elettorali,
// che il Ministero dell'Interno pubblica a volte in Excel. Evita una dipendenza in più.
import AdmZip from "adm-zip";

const decodifica = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

/** "AB12" → 27 (indice di colonna a base 0) */
const colonna = (ref) => {
  let n = 0;
  for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/** Righe del primo foglio come array di stringhe. */
export function righeXlsx(buf) {
  const zip = new AdmZip(buf);
  const testo = (nome) => zip.getEntry(nome)?.getData().toString("utf8");
  const condivise = [...(testo("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decodifica([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")),
  );
  const foglio =
    testo("xl/worksheets/sheet1.xml") ?? testo(zip.getEntries().find((e) => /^xl\/worksheets\/sheet\d*\.xml$/.test(e.entryName)).entryName);
  const righe = [];
  for (const r of foglio.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const riga = [];
    for (const c of r[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attr = c[1];
      const ref = attr.match(/r="([A-Z]+\d+)"/)?.[1];
      const tipo = attr.match(/t="(\w+)"/)?.[1];
      const corpo = c[2] ?? "";
      let v = corpo.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (tipo === "s") v = condivise[Number(v)];
      else if (tipo === "inlineStr") v = [...corpo.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("");
      riga[ref ? colonna(ref) : riga.length] = decodifica(v ?? "");
    }
    righe.push(Array.from(riga, (x) => x ?? ""));
  }
  return righe;
}

/** Righe come oggetti, con l'intestazione nella riga indicata. */
export function oggettiXlsx(buf, rigaIntestazione = 0) {
  const righe = righeXlsx(buf);
  const int = righe[rigaIntestazione].map((h) => h.trim());
  return righe.slice(rigaIntestazione + 1).map((r) => Object.fromEntries(int.map((h, i) => [h, (r[i] ?? "").trim()])));
}
