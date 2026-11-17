import type { HierarchyPointNode } from "d3";
export type SpreadsheetRow = {
  id: string;
  parent_id: string | null;
  name: string;
  value?: number;
  category?: string;
  description?: string;
  kpi?: string;
};
export type TreeNodeData = SpreadsheetRow & { children?: TreeNodeData[] };
export type TreeNode = HierarchyPointNode<TreeNodeData>;
export type SelectedNode = {
  row: SpreadsheetRow;
  parentName: string | null;
  children: SpreadsheetRow[];
};
