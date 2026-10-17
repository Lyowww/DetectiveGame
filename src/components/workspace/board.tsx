"use client";

import { useMemo } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { BoardEdge, BoardNode } from "@/lib/types";

export function BoardCanvas({
  nodes,
  edges,
  onMove,
}: {
  nodes: BoardNode[];
  edges: BoardEdge[];
  onMove: (id: string, x: number, y: number) => void;
}) {
  const flowNodes = useMemo<Node[]>(
    () =>
      nodes.map((node) => ({
        id: node.id,
        position: { x: node.x, y: node.y },
        data: { label: node.label },
        style: {
          background: "#f4f0e6",
          color: "#1c1914",
          border: "1px solid #8d6232",
          width: 180,
          fontSize: 14,
        },
      })),
    [nodes],
  );
  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ? `${edge.state}: ${edge.label}` : edge.state,
      })),
    [edges],
  );

  return (
    <div className="board-shell" aria-label="Connection board">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodeDragStop={(_event, node) => onMove(node.id, node.position.x, node.position.y)}
        fitView
        preventScrolling
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
