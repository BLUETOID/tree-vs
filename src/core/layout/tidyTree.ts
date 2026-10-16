/**
 * Collision-Free Hierarchical Tree Layout Algorithm
 * Computes bottom-up subtree widths so that no two nodes or subtrees can ever collide or overlap.
 * Based on the proven layout architecture from vs-recursion.
 */

import type { TreeNodeData, TreeLayoutNode, TreeLayoutEdge, TreeEdgeState } from '../../types/tree';

export interface TreeLayoutResult {
  nodes: TreeLayoutNode[];
  edges: TreeLayoutEdge[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

const NODE_RADIUS = 22;
const NODE_WIDTH = 54; // Width allocation for a circular tree node
const NODE_GAP_X = 36; // Minimum horizontal gap between sibling subtrees
const LEVEL_HEIGHT_Y = 85; // Vertical spacing between tree levels

export function computeTreeLayout(
  nodesMap: Record<string, TreeNodeData>,
  rootId: string | null
): TreeLayoutResult {
  if (!rootId || !nodesMap[rootId] || Object.keys(nodesMap).length === 0) {
    return {
      nodes: [],
      edges: [],
      bounds: { minX: 0, maxX: 600, minY: 0, maxY: 400, width: 600, height: 400 },
    };
  }

  // 1. Build parent -> children map and find valid roots
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  const allIds = new Set(Object.keys(nodesMap));

  for (const [id, data] of Object.entries(nodesMap)) {
    const children: string[] = [];
    if (data.left && allIds.has(data.left)) {
      children.push(data.left);
      parentMap.set(data.left, id);
    }
    if (data.right && allIds.has(data.right)) {
      children.push(data.right);
      parentMap.set(data.right, id);
    }
    childrenMap.set(id, children);
  }

  // Identify roots: starting with the provided rootId, or any node without parent
  const roots: string[] = [];
  if (nodesMap[rootId]) {
    roots.push(rootId);
  }
  for (const id of allIds) {
    if (!parentMap.has(id) && id !== rootId) {
      roots.push(id);
    }
  }

  // 2. Bottom-up subtree width computation to guarantee zero collision
  const subtreeWidths = new Map<string, number>();
  const visitedSubtree = new Set<string>();

  function computeSubtreeWidth(id: string): number {
    if (visitedSubtree.has(id)) {
      return subtreeWidths.get(id) || (NODE_WIDTH + NODE_GAP_X);
    }
    visitedSubtree.add(id);

    const children = childrenMap.get(id) || [];
    const selfWidth = NODE_WIDTH + NODE_GAP_X;

    if (children.length === 0) {
      subtreeWidths.set(id, selfWidth);
      return selfWidth;
    }

    let childrenTotalWidth = 0;
    for (const childId of children) {
      childrenTotalWidth += computeSubtreeWidth(childId);
    }

    const totalWidth = Math.max(selfWidth, childrenTotalWidth);
    subtreeWidths.set(id, totalWidth);
    return totalWidth;
  }

  for (const r of roots) {
    computeSubtreeWidth(r);
  }

  // 3. Top-down position placement with strict non-overlapping partitions
  const positions = new Map<string, { x: number; y: number }>();
  const visitedLayout = new Set<string>();

  function layoutSubtree(id: string, startX: number, depth: number): void {
    if (visitedLayout.has(id)) return;
    visitedLayout.add(id);

    const subWidth = subtreeWidths.get(id) || (NODE_WIDTH + NODE_GAP_X);
    const y = 60 + depth * LEVEL_HEIGHT_Y;
    const children = childrenMap.get(id) || [];

    if (children.length === 0) {
      const x = startX + subWidth / 2;
      positions.set(id, { x, y });
      return;
    }

    let childrenTotalWidth = 0;
    for (const childId of children) {
      childrenTotalWidth += subtreeWidths.get(childId) || (NODE_WIDTH + NODE_GAP_X);
    }

    const childOffset = Math.max(0, (subWidth - childrenTotalWidth) / 2);
    let currentChildX = startX + childOffset;
    const childXs: number[] = [];

    for (const childId of children) {
      const cWidth = subtreeWidths.get(childId) || (NODE_WIDTH + NODE_GAP_X);
      layoutSubtree(childId, currentChildX, depth + 1);
      childXs.push(currentChildX + cWidth / 2);
      currentChildX += cWidth;
    }

    // Center parent over its children
    const midChildX = (childXs[0] + childXs[childXs.length - 1]) / 2;
    positions.set(id, { x: midChildX, y });
  }

  let currentStartX = 60;
  for (const r of roots) {
    layoutSubtree(r, currentStartX, 0);
    currentStartX += (subtreeWidths.get(r) || (NODE_WIDTH + NODE_GAP_X)) + 40;
  }

  // 4. Assemble layout nodes, curved connecting edges, and bounds
  const layoutNodes: TreeLayoutNode[] = [];
  const layoutEdges: TreeLayoutEdge[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const [id, data] of Object.entries(nodesMap)) {
    const pos = positions.get(id) || { x: 100, y: 100 };
    minX = Math.min(minX, pos.x - NODE_RADIUS);
    maxX = Math.max(maxX, pos.x + NODE_RADIUS);
    minY = Math.min(minY, pos.y - NODE_RADIUS);
    maxY = Math.max(maxY, pos.y + NODE_RADIUS);

    layoutNodes.push({
      id,
      val: data.val,
      x: pos.x,
      y: pos.y,
      radius: NODE_RADIUS,
      state: data.state || 'default',
      height: data.height,
      balanceFactor: data.balanceFactor,
      isWordEnd: data.isWordEnd,
      rank: data.rank,
    });

    // Left child edge
    if (data.left && positions.has(data.left)) {
      const childPos = positions.get(data.left)!;
      let edgeState: TreeEdgeState = 'default';
      if (data.state === 'active' || data.state === 'comparing') edgeState = 'active';

      layoutEdges.push({
        id: `e-${id}-${data.left}`,
        from: id,
        to: data.left,
        x1: pos.x,
        y1: pos.y + NODE_RADIUS,
        x2: childPos.x,
        y2: childPos.y - NODE_RADIUS,
        label: 'L',
        state: edgeState,
      });
    }

    // Right child edge
    if (data.right && positions.has(data.right)) {
      const childPos = positions.get(data.right)!;
      let edgeState: TreeEdgeState = 'default';
      if (data.state === 'active' || data.state === 'comparing') edgeState = 'active';

      layoutEdges.push({
        id: `e-${id}-${data.right}`,
        from: id,
        to: data.right,
        x1: pos.x,
        y1: pos.y + NODE_RADIUS,
        x2: childPos.x,
        y2: childPos.y - NODE_RADIUS,
        label: 'R',
        state: edgeState,
      });
    }
  }

  if (!isFinite(minX)) {
    minX = 0;
    maxX = 400;
    minY = 0;
    maxY = 300;
  }

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    bounds: {
      minX: minX - 40,
      maxX: maxX + 40,
      minY: minY - 30,
      maxY: maxY + 50,
      width: Math.max(500, maxX - minX + 80),
      height: Math.max(350, maxY - minY + 80),
    },
  };
}
