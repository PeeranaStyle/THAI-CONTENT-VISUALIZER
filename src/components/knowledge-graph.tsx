"use client";

import { useCallback, useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, Handle, Position, type Edge, type Node, type NodeProps } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { Maximize2, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import "@xyflow/react/dist/style.css";

type GraphNode = { id: string; title: string; description: string; node_type: string; source_references: { quote: string; page?: number }[] };
type GraphEdge = { id: string; source_node_id: string; target_node_id: string; relationship: string };
const NODE_W = 240;
const NODE_H = 132;
function ConceptNode({ data }: NodeProps<Node<{ title: string; description: string; kind: string; selected: boolean }>>) {
  return <div className={`relative w-[240px] rounded-2xl border bg-[var(--surface)] p-4 shadow-lg ${data.kind === "central" ? "border-[var(--signal)] ring-2 ring-[var(--signal)]/20" : "border-[var(--line)]"}`}><Handle type="target" position={Position.Top} className="!bg-[var(--signal)]"/><span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal)]">{data.kind === "central" ? "เนเธเนเธเน€เธฃเธทเนเธญเธ" : data.kind === "example" ? "เธ•เธฑเธงเธญเธขเนเธฒเธ" : "เนเธเธงเธเธดเธ”"}</span><p className="mt-1 text-sm font-bold text-[var(--ink)]">{data.title}</p><p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--text-soft)]">{data.description}</p><Handle type="source" position={Position.Bottom} className="!bg-[var(--signal)]"/></div>;
}
const nodeTypes = { concept: ConceptNode };
function layout(nodes: GraphNode[], edges: GraphEdge[]): Node[] {
  const g = new dagre.graphlib.Graph(); g.setDefaultEdgeLabel(() => ({})); g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 100 });
  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H })); edges.forEach(e => g.setEdge(e.source_node_id, e.target_node_id)); dagre.layout(g);
  return nodes.map(n => { const p = g.node(n.id); return { id: n.id, type: "concept", position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 }, data: { title: n.title, description: n.description, kind: n.node_type, selected: false } }; });
}
export function KnowledgeGraph({ graph, nodes: sourceNodes, edges: sourceEdges }: { graph: { id: string; title: string; material_id: string }; nodes: GraphNode[]; edges: GraphEdge[] }) {
  const [query, setQuery] = useState(""); const [selectedId, setSelectedId] = useState<string | null>(null); const [fullscreen, setFullscreen] = useState(false);
  const nodes = useMemo(() => layout(sourceNodes, sourceEdges), [sourceNodes, sourceEdges]);
  const edges = useMemo<Edge[]>(() => sourceEdges.map(e => ({ id: e.id, source: e.source_node_id, target: e.target_node_id, label: e.relationship, animated: false, style: { stroke: "#8298ad", strokeWidth: 1.5 }, labelStyle: { fill: "#52677b", fontSize: 11 }, labelBgStyle: { fill: "#faf9f5" } })), [sourceEdges]);
  const selected = sourceNodes.find(n => n.id === selectedId);
  const onNodeClick = useCallback((_: unknown, node: Node) => setSelectedId(node.id), []);
  const visibleNodes = query ? nodes.filter(n => String(n.data.title).toLocaleLowerCase().includes(query.toLocaleLowerCase())) : nodes;
  const shown = visibleNodes.map(n => ({ ...n, data: { ...n.data, selected: n.id === selectedId } }));
  return <div className={fullscreen ? "fixed inset-0 z-50 bg-[var(--chalk)] p-4" : "space-y-4"}>
    <div className="flex flex-wrap items-center gap-3"><label className="flex h-10 min-w-52 flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3"><Search className="size-4 text-[var(--text-soft)]"/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="เธเนเธเธซเธฒเนเธเธงเธเธดเธ”" placeholder="เธเนเธเธซเธฒเนเธเธงเธเธดเธ”เนเธเนเธเธเธ เธฒเธโ€ฆ" className="w-full bg-transparent text-sm outline-none"/></label><button type="button" onClick={()=>setFullscreen(!fullscreen)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"><Maximize2 className="size-4"/>{fullscreen ? "เธญเธญเธเธเธฒเธเน€เธ•เนเธกเธเธญ" : "เน€เธ•เนเธกเธเธญ"}</button><Link href={`/quiz/create?materialId=${graph.material_id}&coverage=selected_node&graphId=${graph.id}${selectedId ? `&graphNodeId=${selectedId}` : ""}`} className="primary-action inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--signal)] px-4 text-sm font-semibold text-white"><Sparkles className="size-4"/>เธชเธฃเนเธฒเธเนเธเธเธ—เธ”เธชเธญเธเธเธฒเธเนเธเธงเธเธดเธ”</Link></div>
    <div className={`relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-[#f5f8fa] ${fullscreen ? "h-[calc(100vh-90px)]" : "h-[min(68vh,720px)] min-h-[480px]"}`}><ReactFlow nodes={shown} edges={edges} nodeTypes={nodeTypes} onNodeClick={onNodeClick} fitView fitViewOptions={{ padding: .2 }} minZoom={.2} maxZoom={1.8} nodesConnectable={false} elementsSelectable proOptions={{ hideAttribution: true }}><Background color="#d9e3e9" gap={22}/><Controls/><MiniMap pannable zoomable nodeColor={n => n.id === selectedId ? "#3c6bce" : "#a7c9b0"}/></ReactFlow></div>
    {selected && <section aria-live="polite" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[var(--signal)]">เนเธเธงเธเธดเธ”เธ—เธตเนเน€เธฅเธทเธญเธ</p><h2 className="mt-1 text-lg font-bold text-[var(--ink)]">{selected.title}</h2></div><Link href={`/quiz/create?materialId=${graph.material_id}&coverage=selected_node&graphId=${graph.id}&graphNodeId=${selected.id}`} className="text-sm font-semibold text-[var(--signal)]">เธเธถเธเน€เธฃเธทเนเธญเธเธเธตเน โ’</Link></div><p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{selected.description}</p><div className="mt-4 border-t border-[var(--line)] pt-3"><p className="text-xs font-semibold">เธเนเธญเธเธงเธฒเธกเธญเนเธฒเธเธญเธดเธเธเธฒเธเธเธ—เน€เธฃเธตเธขเธ</p>{selected.source_references.map((r,i)=><blockquote key={i} className="mt-2 border-l-2 border-[var(--leaf)] pl-3 text-xs leading-6 text-[var(--text-soft)]">โ€{r.quote}โ€{r.page && <span className="ml-2">เธซเธเนเธฒ {r.page}</span>}</blockquote>)}</div></section>}
  </div>;
}
