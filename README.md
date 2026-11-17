# Hierarchy Explorer

Collapsible tree (React + TypeScript + D3 + Tailwind) driven by a Google Sheet.

## Setup
```bash
npm install
cp .env.example .env   # then set VITE_SPREADSHEET_CSV_URL
npm run dev            # http://localhost:5173
npm run build          # type-check + production build
```
With no URL set, built-in sample data 

## Google Sheet
1. Create a sheet with the header row: `No, Parent, Redefining Initiative (L0), Strategy Program (L1), InitiativeCharter (L2), SubCharter (L3), SubInitiative (L4), Fase, Keterangan, KPI`. A banner row above the header is allowed.
2. **File → Share → Publish to web**, choose the sheet tab and **Comma-separated values (.csv)**, then Publish.
3. Copy the link into `VITE_SPREADSHEET_CSV_URL` and restart the dev server.

## How the hierarchy works
Each filled `(Lx)` cell becomes a node. Its parent is the nearest filled level above it (in the same row, or the last row that filled that level). `Fase` → category, `Keterangan` → description, `KPI` → KPI. Column order is read from the header, not fixed. If there are several top-level nodes, they are wrapped under a synthetic `Root`.
Validation reports missing/duplicate ids, missing names, unknown parents, multiple roots and cycles before anything is drawn.

## Architecture
`spreadsheet.ts` → `validateTreeData` → `transformTree` → `CollapsibleTree` (D3 owns the SVG; React owns selection, search, filter, status).
Trees over 300 nodes start collapsed below depth 2.
