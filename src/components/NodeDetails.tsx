import type { SelectedNode } from "../types/tree";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 text-sm text-slate-900">{children}</dd></div>
);

export default function NodeDetails({ node }: { node: SelectedNode | null }) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">Node details</h2>
      {!node ? <p className="text-sm text-slate-500">Select a node to view its details.</p> : (
        <dl className="space-y-3">
          <Field label="Name">{node.row.name}</Field>
          <Field label="Category">{node.row.category ?? "—"}</Field>
          <Field label="Value">{node.row.value ?? "—"}</Field>
          <Field label="Description">{node.row.description ?? "—"}</Field>
          <Field label="KPI">{node.row.kpi ?? "—"}</Field>
          <Field label="Parent">{node.parentName ?? "None (root)"}</Field>
          <Field label={`Children (${node.children.length})`}>
            {node.children.length ? <ul className="list-disc pl-4">{node.children.map((c) => <li key={c.id}>{c.name}</li>)}</ul> : "0"}
          </Field>
        </dl>
      )}
    </aside>
  );
}
