import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as d3 from "d3";
import type { TreeNode, TreeNodeData } from "../types/tree";

export type TreeHandle = { zoomIn(): void; zoomOut(): void; reset(): void };
type Props = {
  data: TreeNodeData;
  selectedId: string | null;
  matchIds: Set<string>;
  contextIds: Set<string> | null;
  onSelect: (id: string) => void;
};
type Api = {
  paint(): void;
  reveal(ids: Set<string>): void;
  fit(animate: boolean): void;
  zoom(f: number): void;
};
type Pt = { x: number; y: number };
type Link = d3.HierarchyPointLink<TreeNodeData>;

// Full text is in the hover tooltip; SVG labels are clipped so long names don't spill across the tree.
const LABEL_MAX = 40;
const clip = (s: string) =>
  s.length > LABEL_MAX ? `${s.slice(0, LABEL_MAX - 1).trimEnd()}…` : s;

const linkPath = (s: Pt, t: Pt) => {
  const m = (s.x + t.x) / 2;
  return `M${s.x},${s.y}C${m},${s.y} ${m},${t.y} ${t.x},${t.y}`;
};

const CollapsibleTree = forwardRef<TreeHandle, Props>(
  function CollapsibleTree(props, ref) {
    const { data, selectedId, matchIds, contextIds } = props;
    const wrap = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const tip = useRef<HTMLDivElement>(null);
    const api = useRef<Api>();
    const live = useRef(props);
    live.current = props;

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => api.current?.zoom(1.3),
        zoomOut: () => api.current?.zoom(1 / 1.3),
        reset: () => api.current?.fit(true),
      }),
      [],
    );

    // Build once per dataset; D3 owns everything inside the <svg>.
    useEffect(() => {
      const svg = d3.select(svgRef.current!);
      const g = svg.append("g");
      const linkG = g.append("g").attr("fill", "none");
      const nodeG = g.append("g");
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const parent = new Map<string, string>();
      const byId = new Map<string, TreeNodeData>();
      (function walk(n: TreeNodeData) {
        byId.set(n.id, n);
        n.children?.forEach((c) => {
          parent.set(c.id, n.id);
          walk(c);
        });
      })(data);
      const depthOf = (id: string) => {
        let d = 0;
        for (let p = parent.get(id); p; p = parent.get(p)) d++;
        return d;
      };
      const collapsed = new Set<string>();
      if (byId.size > 300)
        byId.forEach((n) => {
          if (n.children?.length && depthOf(n.id) >= 2) collapsed.add(n.id);
        });

      let prev = new Map<string, Pt>();
      let pos = new Map<string, Pt>();
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (e) => g.attr("transform", e.transform.toString()));
      svg.call(zoom).on("dblclick.zoom", null);
      const size = () => ({
        w: svgRef.current!.clientWidth,
        h: svgRef.current!.clientHeight,
      });

      const paint = () => {
        const { selectedId: s, matchIds: m, contextIds: c } = live.current;
        nodeG.selectAll<SVGGElement, TreeNode>("g.node").each(function (d) {
          const id = d.data.id,
            sel = id === s,
            hit = m.has(id),
            isParent = !!d.data.children?.length;
          const el = d3
            .select(this)
            .style("opacity", c && !c.has(id) ? 0.25 : 1);
          el.select("circle")
            .attr("r", sel ? 9 : 7)
            .attr(
              "fill",
              hit
                ? "#10b981"
                : !d.parent
                  ? "#0f172a"
                  : isParent
                    ? collapsed.has(id)
                      ? "#4f46e5"
                      : "#a5b4fc"
                    : "#ffffff",
            )
            .attr("stroke", sel ? "#f59e0b" : hit ? "#047857" : "#475569")
            .attr("stroke-width", sel ? 3.5 : 1.5);
          el.select("text").attr("font-weight", sel || hit ? 600 : 400);
        });
        linkG
          .selectAll<SVGPathElement, Link>("path")
          .attr("stroke", (d) =>
            m.has(d.target.data.id) || m.has(d.source.data.id)
              ? "#10b981"
              : "#cbd5e1",
          )
          .attr("stroke-width", (d) =>
            m.has(d.target.data.id) || m.has(d.source.data.id) ? 2.2 : 1.2,
          );
      };

      const showTip = (e: PointerEvent, d: TreeNode) => {
        const [x, y] = d3.pointer(e, wrap.current);
        d3.select(tip.current!)
          .style("display", "block")
          .style("left", `${x + 14}px`)
          .style("top", `${y + 14}px`)
          .html("")
          .call((t) => {
            t.append("div").attr("class", "font-medium").text(d.data.name);
            t.append("div").text(`Category: ${d.data.category ?? "—"}`);
            t.append("div").text(`Value: ${d.data.value ?? "—"}`);
            t.append("div").text(`Children: ${d.data.children?.length ?? 0}`);
          });
      };

      const update = (animate = true) => {
        const dur = reduce || !animate ? 0 : 300;
        const layout = d3.tree<TreeNodeData>().nodeSize([26, 200])(
          d3.hierarchy(data, (d) =>
            collapsed.has(d.id) ? undefined : d.children,
          ),
        );
        const nodes = layout.descendants();
        pos = new Map(nodes.map((n) => [n.data.id, { x: n.y, y: n.x }]));
        const start = (n: TreeNode): Pt => {
          let id: string | undefined = n.data.id;
          while (id && !prev.has(id)) id = parent.get(id);
          return (id && prev.get(id)) || pos.get(n.data.id)!;
        };

        linkG
          .selectAll<SVGPathElement, Link>("path")
          .data(layout.links(), (d) => d.target.data.id)
          .join(
            (en) =>
              en
                .append("path")
                .attr("d", (d) => linkPath(start(d.target), start(d.target))),
            (u) => u,
            (ex) => ex.remove(),
          )
          .transition()
          .duration(dur)
          .attr("d", (d) =>
            linkPath(pos.get(d.source.data.id)!, pos.get(d.target.data.id)!),
          );

        const sel = nodeG
          .selectAll<SVGGElement, TreeNode>("g.node")
          .data(nodes, (d) => d.data.id)
          .join(
            (en) => {
              const e = en
                .append("g")
                .attr("class", "node")
                .style("cursor", "pointer")
                .attr("transform", (d) => {
                  const s = start(d);
                  return `translate(${s.x},${s.y})`;
                });
              e.append("circle");
              e.append("text").attr("x", 13).attr("dy", "0.32em");
              return e;
            },
            (u) => u,
            (ex) => ex.remove(),
          );
        sel
          .select("text")
          .text((d) =>
            clip(
              d.data.value != null
                ? `${d.data.name} · ${d.data.value}`
                : d.data.name,
            ),
          );
        sel
          .transition()
          .duration(dur)
          .attr("transform", (d) => `translate(${d.y},${d.x})`);
        sel
          .on("click", (_e, d) => {
            if (d.data.children?.length) {
              if (collapsed.has(d.data.id)) collapsed.delete(d.data.id);
              else collapsed.add(d.data.id);
            }
            live.current.onSelect(d.data.id);
            update();
          })
          .on("pointerenter", function (e: PointerEvent, d) {
            d3.select(this).select("circle").attr("r", 9);
            showTip(e, d);
          })
          .on("pointermove", showTip)
          .on("pointerleave", function () {
            tip.current!.style.display = "none";
            paint();
          });

        prev = pos;
        paint();
      };

      const fit = (animate: boolean) => {
        const pts = [...pos.values()];
        if (!pts.length) return;
        const { w, h } = size();
        const x0 = d3.min(pts, (p) => p.x)! - 30,
          x1 = d3.max(pts, (p) => p.x)! + 170;
        const y0 = d3.min(pts, (p) => p.y)! - 30,
          y1 = d3.max(pts, (p) => p.y)! + 30;
        const k = Math.min(w / (x1 - x0), h / (y1 - y0), 1.2);
        const t = d3.zoomIdentity
          .translate(w / 2 - ((x0 + x1) / 2) * k, h / 2 - ((y0 + y1) / 2) * k)
          .scale(k);
        (animate && !reduce ? svg.transition().duration(400) : svg).call(
          zoom.transform as never,
          t,
        );
      };

      api.current = {
        paint,
        fit,
        zoom: (f) =>
          void (reduce ? svg : svg.transition().duration(200)).call(
            zoom.scaleBy as never,
            f,
          ),
        reveal: (ids) => {
          if (!ids.size) return;
          ids.forEach((id) => {
            for (let p = parent.get(id); p; p = parent.get(p))
              collapsed.delete(p);
          });
          update();
          const first = pos.get(ids.values().next().value as string);
          if (!first) return;
          const { w, h } = size();
          const k = Math.max(d3.zoomTransform(svgRef.current!).k, 1);
          (reduce ? svg : svg.transition().duration(400)).call(
            zoom.transform as never,
            d3.zoomIdentity
              .translate(w / 2 - first.x * k, h / 2 - first.y * k)
              .scale(k),
          );
        },
      };
      update(false);
      fit(false);
      return () => {
        svg.on(".zoom", null);
        svg.selectAll("g").remove();
        api.current = undefined;
      };
    }, [data]);

    useEffect(() => api.current?.paint(), [selectedId, matchIds, contextIds]);
    useEffect(() => api.current?.reveal(matchIds), [matchIds]);

    return (
      <div ref={wrap} className="relative h-full w-full overflow-hidden">
        <svg
          ref={svgRef}
          className="tree-svg h-full w-full touch-none"
          role="img"
          aria-label="Collapsible hierarchy tree"
        />
        <div
          ref={tip}
          className="pointer-events-none absolute hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm"
        />
      </div>
    );
  },
);
export default CollapsibleTree;
