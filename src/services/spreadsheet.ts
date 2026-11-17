import type { SpreadsheetRow } from "../types/tree";

const SAMPLE = `No,Parent,Redefining Initiative (L0),Strategy Program (L1),InitiativeCharter (L2),SubCharter (L3),SubInitiative (L4),Fase,Keterangan,KPI
1,,PLN,,,,,,Organisasi utama,
2,,,Jawa,,,,,Wilayah Jawa,
3,,,,Jakarta,,,,Kota Jakarta,
4,,,,,Bandung,,,Kota Bandung,
5,,,Sumatera,,,,,Wilayah Sumatera,
6,,,,Medan,,,,Kota Medan,`;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cur = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/**
 * Hierarchy comes from the "(L0)".."(L4)" columns: a row's node is its deepest
 * filled level, and its parent is the nearest filled level above it.
 * Rows with no level text (e.g. banner/blank) are skipped.
 */
export function csvToRows(text: string): SpreadsheetRow[] {
  const all = parseCsv(text);
  const hi = all.findIndex((r) => r[0]?.trim().toLowerCase() === "no");
  const header = all[hi < 0 ? 0 : hi] ?? [];
  const body = all.slice(hi < 0 ? 1 : hi + 1);

  const col = (name: string) =>
    header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const levelCols = header
    .flatMap((h, i) => {
      const m = /\(L(\d+)\)/i.exec(h);
      return m ? [{ i, level: Number(m[1]) }] : [];
    })
    .sort((a, b) => a.level - b.level);
  const faseCol = col("Fase"),
    ketCol = col("Keterangan"),
    kpiCol = col("KPI");
  const at = (r: string[], i: number) =>
    i < 0 ? "" : (r[i] ?? "").replace(/\s+/g, " ").trim();

  const rows: SpreadsheetRow[] = [];
  const stack: string[] = []; // node id per level index
  body.forEach((r, n) => {
    // Every filled level cell is a node, chained to the nearest filled level above.
    // Fase/Keterangan/KPI describe the row, so they go on its deepest node only.
    const filled = levelCols.flatMap(({ i }, j) => (at(r, i) ? [j] : []));
    filled.forEach((j, idx) => {
      const last = idx === filled.length - 1;
      const id = `${n + 1}:L${j}`;
      rows.push({
        id,
        parent_id: stack.slice(0, j).reverse().find(Boolean) ?? null,
        name: at(r, levelCols[j].i),
        category: last ? at(r, faseCol) || undefined : undefined,
        description: last ? at(r, ketCol) || undefined : undefined,
        kpi: last ? at(r, kpiCol) || undefined : undefined,
      });
      stack[j] = id;
      stack.length = j + 1;
    });
  });

  // Exactly one root is required by validation; wrap multiple top-level rows.
  const tops = rows.filter((r) => !r.parent_id);
  if (tops.length > 1) {
    tops.forEach((t) => (t.parent_id = "root"));
    rows.unshift({ id: "root", parent_id: null, name: "Root" });
  }
  return rows;
}

/** Swap this function's body for the Google Sheets API later; callers only see SpreadsheetRow[]. */
export async function fetchSpreadsheetRows(): Promise<SpreadsheetRow[]> {
  const url = import.meta.env.VITE_SPREADSHEET_CSV_URL as string | undefined;
  console.log("Spreadsheet URL:", url);
  if (!url) return csvToRows(SAMPLE);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return csvToRows(await res.text());
}
