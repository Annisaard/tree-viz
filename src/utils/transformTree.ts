import type { SpreadsheetRow, TreeNodeData } from "../types/tree";

/** Flat rows (validated) -> nested structure for d3.hierarchy(). */
export function transformTree(rows: SpreadsheetRow[]): TreeNodeData {
  const nodes = new Map<string, TreeNodeData>(rows.map((r) => [r.id, { ...r }]));
  let root!: TreeNodeData;
  for (const n of nodes.values()) {
    if (!n.parent_id) { root = n; continue; }
    const p = nodes.get(n.parent_id)!;
    (p.children ??= []).push(n);
  }
  return root;
}
