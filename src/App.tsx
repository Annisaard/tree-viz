import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Maximize2,
  Minus,
  Network,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import CollapsibleTree, { type TreeHandle } from "./components/CollapsibleTree";
import NodeDetails from "./components/NodeDetails";
import LoadingState from "./components/LoadingState";
import { useSpreadsheetData } from "./hooks/useSpreadsheetData";
import type { SelectedNode, SpreadsheetRow } from "./types/tree";

const btn =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600";

function Message({
  title,
  children,
  onRetry,
}: {
  title: string;
  children?: React.ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle className="size-6 text-amber-500" />
      <h2 className="font-semibold">{title}</h2>
      <div className="max-w-md text-sm text-slate-600">{children}</div>
      {onRetry && (
        <button className={btn} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export default function App() {
  const { state, reload } = useSpreadsheetData();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tree = useRef<TreeHandle>(null);
  const rows = useMemo<SpreadsheetRow[]>(
    () => (state.status === "ready" ? state.rows : []),
    [state],
  );
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter(Boolean))] as string[],
    [rows],
  );

  const q = query.trim().toLowerCase();
  const matchIds = useMemo(
    () =>
      new Set(
        q
          ? rows
              .filter((r) =>
                [r.name, r.category, r.description].some((f) =>
                  f?.toLowerCase().includes(q),
                ),
              )
              .map((r) => r.id)
          : [],
      ),
    [rows, q],
  );
  const contextIds = useMemo(() => {
    if (category === "All") return null;
    const s = new Set<string>();
    rows
      .filter((r) => r.category === category)
      .forEach((r) => {
        for (
          let c: SpreadsheetRow | undefined = r;
          c && !s.has(c.id);
          c = c.parent_id ? byId.get(c.parent_id) : undefined
        )
          s.add(c.id);
      });
    return s;
  }, [rows, byId, category]);

  const selected: SelectedNode | null = useMemo(() => {
    const row = selectedId ? byId.get(selectedId) : undefined;
    return row
      ? {
          row,
          parentName: row.parent_id
            ? (byId.get(row.parent_id)?.name ?? null)
            : null,
          children: rows.filter((r) => r.parent_id === row.id),
        }
      : null;
  }, [selectedId, byId, rows]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <Network className="size-5 text-indigo-600" /> Hierarchy Explorer
        </div>
        <button className={btn} onClick={reload}>
          <RefreshCw className="size-4" /> Refresh data
        </button>
      </header>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <label className="relative min-w-48 flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes..."
            aria-label="Search nodes"
            className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600"
          />
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter category"
          className={btn}
        >
          <option>All</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {q && (
          <span
            className="self-center text-sm text-slate-600"
            aria-live="polite"
          >
            {matchIds.size
              ? `${matchIds.size} result${matchIds.size > 1 ? "s" : ""} found`
              : "No nodes found."}
          </span>
        )}
      </div>
      <main className="grid min-h-0 flex-1 grid-rows-[minmax(360px,1fr)_auto] gap-3 overflow-auto p-3 lg:grid-cols-[3fr_1fr] lg:grid-rows-1">
        <section className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {state.status === "loading" && <LoadingState />}
          {state.status === "error" && (
            <Message title="Unable to load data." onRetry={reload}>
              Please check the spreadsheet URL and try again.
            </Message>
          )}
          {state.status === "empty" && (
            <Message title="No data available.">
              Add hierarchical data to your spreadsheet and refresh the
              visualization.
            </Message>
          )}
          {state.status === "invalid" && (
            <Message title="Data validation error" onRetry={reload}>
              <ul className="space-y-1 text-left">
                {state.errors.slice(0, 8).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Message>
          )}
          {state.status === "ready" && (
            <CollapsibleTree
              ref={tree}
              data={state.root}
              selectedId={selectedId}
              matchIds={matchIds}
              contextIds={contextIds}
              onSelect={setSelectedId}
            />
          )}
        </section>
        <div className="overflow-auto">
          <NodeDetails node={selected} />
        </div>
      </main>
      <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2">
        <div className="flex gap-2">
          <button
            className={btn}
            onClick={() => tree.current?.zoomOut()}
            aria-label="Zoom out"
          >
            <Minus className="size-4" />
          </button>
          <button className={btn} onClick={() => tree.current?.reset()}>
            <Maximize2 className="size-4" /> Reset view
          </button>
          <button
            className={btn}
            onClick={() => tree.current?.zoomIn()}
            aria-label="Zoom in"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <span className="text-sm text-slate-500">{rows.length} nodes</span>
      </footer>
    </div>
  );
}
