import { describe, expect, it } from "vitest";
import { validateGeneratedGraph } from "@/lib/ai/graph-schema";

const source = "Sunlight provides energy for ecosystems. Plants use sunlight to make food. Herbivores get energy by eating plants.";

const validGraph = {
  title: "Energy in ecosystems",
  centralConceptKey: "energy",
  nodes: [
    { conceptKey: "energy", title: "Energy", description: "Energy moves through living things in an ecosystem.", nodeType: "central", sourceReferences: [{ quote: "Sunlight provides energy for ecosystems." }] },
    { conceptKey: "plants", title: "Plants", description: "Plants use sunlight to make food.", nodeType: "concept", sourceReferences: [{ quote: "Plants use sunlight to make food." }] },
    { conceptKey: "herbivores", title: "Herbivores", description: "Herbivores get energy by eating plants.", nodeType: "concept", sourceReferences: [{ quote: "Herbivores get energy by eating plants." }] },
  ],
  edges: [
    { sourceConceptKey: "energy", targetConceptKey: "plants", relationship: "supports" },
    { sourceConceptKey: "plants", targetConceptKey: "herbivores", relationship: "feed" },
  ],
};

describe("generated graph validation", () => {
  it("accepts valid concepts, relationships, and exact source citations", () => {
    expect(validateGeneratedGraph(validGraph, source).graph).not.toBeNull();
  });

  it("reports citation failures without returning generated content", () => {
    const graph = structuredClone(validGraph);
    graph.nodes[1].sourceReferences[0].quote = "This quote does not appear in the lesson.";
    expect(validateGeneratedGraph(graph, source).diagnostics).toEqual(["citation_not_found_node_1"]);
  });

  it("rejects relationships referencing a nonexistent concept", () => {
    const graph = structuredClone(validGraph);
    graph.edges[0].targetConceptKey = "missing";
    expect(validateGeneratedGraph(graph, source).diagnostics).toEqual(["edge_endpoint_missing_or_self_reference"]);
  });
});
