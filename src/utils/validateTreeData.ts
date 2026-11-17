import type { SpreadsheetRow } from "../types/tree";

export function validateTreeData(rows: SpreadsheetRow[]): string[] {
  const errors: string[] = [];
  const ids = new Map<string, SpreadsheetRow>();
  rows.forEach((r, i) => {
    if (!r.id) return void errors.push(`Row ${i + 2} is missing an id.`);
    if (ids.has(r.id)) errors.push(`Duplicate id "${r.id}".`);
    ids.set(r.id, r);
    if (!r.name) errors.push(`Node "${r.id}" is missing a name.`);
  });
  rows.forEach((r) => {
    if (r.parent_id && !ids.has(r.parent_id))
      errors.push(`Node "${r.id}" references parent "${r.parent_id}", but parent "${r.parent_id}" does not exist.`);
    if (r.parent_id && r.parent_id === r.id) errors.push(`Node "${r.id}" is its own parent.`);
  });
  const roots = rows.filter((r) => !r.parent_id);
  if (roots.length === 0) errors.push("No root node found. Exactly one row must have an empty parent_id.");
  if (roots.length > 1) errors.push(`Multiple root nodes found: ${roots.map((r) => `"${r.id}"`).join(", ")}.`);
  if (errors.length) return errors;
  const rootId = roots[0].id;
  for (const r of rows) {
    const seen = new Set<string>();
    let cur: SpreadsheetRow | undefined = r;
    while (cur && cur.id !== rootId) {
      if (seen.has(cur.id)) { errors.push(`Circular relationship detected at node "${r.id}".`); break; }
      seen.add(cur.id);
      cur = cur.parent_id ? ids.get(cur.parent_id) : undefined;
    }
  }
  return errors;
}
