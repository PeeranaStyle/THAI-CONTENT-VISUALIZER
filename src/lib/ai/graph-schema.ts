import { z } from "zod";
import { normalizeText } from "@/lib/ai/quiz-schema";

export const generatedGraphSchema = z.object({
  title: z.string().trim().min(3).max(140),
  centralConceptKey: z.string().trim().min(1).max(64),
  nodes: z.array(z.object({
    conceptKey: z.string().trim().min(1).max(64),
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(12).max(700),
    nodeType: z.enum(["central", "concept", "example", "definition"]),
    sourceReferences: z.array(z.object({ quote: z.string().trim().min(12).max(600), page: z.number().int().positive().optional() })).min(1).max(3),
  })).min(3).max(30),
  edges: z.array(z.object({
    sourceConceptKey: z.string().trim().min(1).max(64),
    targetConceptKey: z.string().trim().min(1).max(64),
    relationship: z.string().trim().min(2).max(80),
  })).min(2).max(60),
});

export function validateGeneratedGraph(value: unknown, sourceText: string) {
  const parsed = generatedGraphSchema.safeParse(value);
  if (!parsed.success) return { graph: null, error: "IntelSphere returned a graph with an invalid structure." };
  const graph = parsed.data;
  const keys = new Set(graph.nodes.map(node => node.conceptKey));
  if (keys.size !== graph.nodes.length || !keys.has(graph.centralConceptKey)) return { graph: null, error: "The graph has duplicate concepts or no central concept." };
  const source = normalizeText(sourceText);
  if (graph.nodes.some(node => node.sourceReferences.some(reference => !source.includes(normalizeText(reference.quote))))) return { graph: null, error: "A concept citation could not be verified in the source material." };
  const edges = new Set<string>();
  for (const edge of graph.edges) {
    if (!keys.has(edge.sourceConceptKey) || !keys.has(edge.targetConceptKey) || edge.sourceConceptKey === edge.targetConceptKey) return { graph: null, error: "A graph relationship refers to a missing concept." };
    const signature = `${edge.sourceConceptKey}\0${edge.targetConceptKey}\0${edge.relationship}`;
    if (edges.has(signature)) return { graph: null, error: "The graph contains duplicate relationships." };
    edges.add(signature);
  }
  if (!graph.nodes.some(node => node.conceptKey === graph.centralConceptKey && node.nodeType === "central")) return { graph: null, error: "The central concept is missing its central-node type." };
  return { graph, error: undefined };
}
