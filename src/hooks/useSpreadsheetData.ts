import { useCallback, useEffect, useState } from "react";
import { fetchSpreadsheetRows } from "../services/spreadsheet";
import { validateTreeData } from "../utils/validateTreeData";
import { transformTree } from "../utils/transformTree";
import type { SpreadsheetRow, TreeNodeData } from "../types/tree";

export type DataState =
  | { status: "loading" } | { status: "empty" }
  | { status: "error"; message: string } | { status: "invalid"; errors: string[] }
  | { status: "ready"; rows: SpreadsheetRow[]; root: TreeNodeData };

export function useSpreadsheetData() {
  const [state, setState] = useState<DataState>({ status: "loading" });
  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const rows = await fetchSpreadsheetRows();
      if (!rows.length) return setState({ status: "empty" });
      const errors = validateTreeData(rows);
      if (errors.length) return setState({ status: "invalid", errors });
      setState({ status: "ready", rows, root: transformTree(rows) });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Unknown error" });
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { state, reload: load };
}
