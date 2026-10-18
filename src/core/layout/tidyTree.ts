/**
 * Collision-Free Directional Binary & General Tree Layout Algorithm
 * Computes bottom-up subtree width bounding boxes so that no two subtrees can ever collide.
 * Strictly preserves binary left/right directional branching even when single-child nodes exist.
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
const NODE_WIDTH = 54; // Base width for a circular tree node
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

  const allIds = new Set(Object.keys(nodesMap));
  const parentMap = new Map<string, string>();

  for (const [id, data] of Object.entries(nodesMap)) {
    if (data.parent && allIds.has(data.parent)) {
      parentMap.set(id, data.parent);
    } else if (data.children && data.children.length > 0) {
      for (const chId of data.children) {
        if (allIds.has(chId) && !parentMap.has(chId) && chId !== rootId) {
          parentMap.set(chId, id);
        }
      }
    } else {
      if (data.left && allIds.has(data.left) && !parentMap.has(data.left) && data.left !== rootId) {
        parentMap.set(data.left, id);
      }
      if (data.right && allIds.has(data.right) && !parentMap.has(data.right) && data.right !== rootId) {
        parentMap.set(data.right, id);
      }
    }
  }

  // Identify roots: primary tree starts with rootId.
  // Any disconnected nodes without parent are placed as secondary auxiliary roots.
  const roots: string[] = [];
  if (nodesMap[rootId]) {
    roots.push(rootId);
  }
  for (const id of allIds) {
    if (!parentMap.has(id) && id !== rootId) {
      roots.push(id);
    }
  }

  // 1. Bottom-up subtree width computation preserving directional binary slots
  const subtreeWidths = new Map<string, number>();
  const visitedSubtree = new Set<string>();

  function computeBinarySubtreeWidth(id: string): number {
    if (visitedSubtree.has(id)) {
      return subtreeWidths.get(id) || (NODE_WIDTH + NODE_GAP_X);
    }
    visitedSubtree.add(id);

    const node = nodesMap[id];
    if (!node) return NODE_WIDTH + NODE_GAP_X;

    const hasChildren = Boolean(node.children && node.children.length > 0);
    if (hasChildren) {
      const validChildren = node.children!.filter((c) => allIds.has(c) && !visitedSubtree.has(c));
      if (validChildren.length === 0) {
        const w = NODE_WIDTH + NODE_GAP_X;
        subtreeWidths.set(id, w);
        return w;
      }
      let sumWidth = 0;
      for (const ch of validChildren) {
        sumWidth += computeBinarySubtreeWidth(ch);
      }
      const totalWidth = Math.max(NODE_WIDTH + NODE_GAP_X, sumWidth);
      subtreeWidths.set(id, totalWidth);
      return totalWidth;
    }

    const hasLeft = Boolean(node.left && allIds.has(node.left));
    const hasRight = Boolean(node.right && allIds.has(node.right));

    if (!hasLeft && !hasRight) {
      const w = NODE_WIDTH + NODE_GAP_X;
      subtreeWidths.set(id, w);
      return w;
    }

    const wL = hasLeft ? computeBinarySubtreeWidth(node.left!) : 0;
    const wR = hasRight ? computeBinarySubtreeWidth(node.right!) : 0;

    // When single child exists, allocate virtual reserved space for the missing sibling
    // to guarantee the single child angles outward in its proper binary direction.
    const minBranchPadding = (NODE_WIDTH + NODE_GAP_X) * 0.7;
    const effectiveL = hasLeft ? wL : (hasRight ? minBranchPadding : 0);
    const effectiveR = hasRight ? wR : (hasLeft ? minBranchPadding : 0);

    const totalWidth = Math.max(NODE_WIDTH + NODE_GAP_X, effectiveL + effectiveR);
    subtreeWidths.set(id, totalWidth);
    return totalWidth;
  }

  for (const r of roots) {
    computeBinarySubtreeWidth(r);
  }

  // 2. Top-down directional placement with non-overlapping bounding box partitions
  const positions = new Map<string, { x: number; y: number }>();
  const visitedLayout = new Set<string>();

  function layoutBinarySubtree(id: string, startX: number, depth: number): void {
    if (visitedLayout.has(id)) return;
    visitedLayout.add(id);

    const node = nodesMap[id];
    if (!node) return;

    const subWidth = subtreeWidths.get(id) || (NODE_WIDTH + NODE_GAP_X);
    const y = 60 + depth * LEVEL_HEIGHT_Y;

    const hasChildren = Boolean(node.children && node.children.length > 0);
    if (hasChildren) {
      const validChildren = node.children!.filter((c) => allIds.has(c) && !visitedLayout.has(c));
      if (validChildren.length === 0) {
        const x = startX + subWidth / 2;
        positions.set(id, { x, y });
        depths.set(id, depth);
        return;
      }
      let currX = startX;
      const childPositions: number[] = [];
      for (const ch of validChildren) {
        const chW = subtreeWidths.get(ch) || (NODE_WIDTH + NODE_GAP_X);
        layoutBinarySubtree(ch, currX, depth + 1);
        const cPos = positions.get(ch);
        if (cPos) childPositions.push(cPos.x);
        currX += chW;
      }
      const parentX =
        childPositions.length > 0
          ? (childPositions[0] + childPositions[childPositions.length - 1]) / 2
          : startX + subWidth / 2;
      positions.set(id, { x: parentX, y });
      depths.set(id, depth);
      return;
    }

    const hasLeft = Boolean(node.left && allIds.has(node.left));
    const hasRight = Boolean(node.right && allIds.has(node.right));

    if (!hasLeft && !hasRight) {
      const x = startX + subWidth / 2;
      positions.set(id, { x, y });
      return;
    }

    const minBranchPadding = (NODE_WIDTH + NODE_GAP_X) * 0.7;
    const wL = hasLeft ? (subtreeWidths.get(node.left!) || (NODE_WIDTH + NODE_GAP_X)) : minBranchPadding;
    const wR = hasRight ? (subtreeWidths.get(node.right!) || (NODE_WIDTH + NODE_GAP_X)) : minBranchPadding;

    const effectiveL = hasLeft ? wL : minBranchPadding;
    const effectiveR = hasRight ? wR : minBranchPadding;
    const totalEffective = effectiveL + effectiveR;
    const offset = Math.max(0, (subWidth - totalEffective) / 2);

    let leftCenterX = startX + offset + effectiveL / 2;
    let rightCenterX = startX + offset + effectiveL + effectiveR / 2;

    if (hasLeft) {
      layoutBinarySubtree(node.left!, startX + offset, depth + 1);
      const lPos = positions.get(node.left!);
      if (lPos) leftCenterX = lPos.x;
    }

    if (hasRight) {
      layoutBinarySubtree(node.right!, startX + offset + effectiveL, depth + 1);
      const rPos = positions.get(node.right!);
      if (rPos) rightCenterX = rPos.x;
    }

    // Directional parent centering:
    // Left child strictly branches left (< parentX), right child strictly branches right (> parentX)
    let parentX = (leftCenterX + rightCenterX) / 2;
    if (hasLeft && !hasRight) {
      parentX = leftCenterX + minBranchPadding;
    } else if (!hasLeft && hasRight) {
      parentX = rightCenterX - minBranchPadding;
    }

    depths.set(id, depth);
    positions.set(id, { x: parentX, y });
  }

  const depths = new Map<string, number>();
  const heights = new Map<string, number>();
  const visitingHeight = new Set<string>();

  function calcSubtreeHeight(id: string): number {
    if (heights.has(id)) return heights.get(id)!;
    if (visitingHeight.has(id)) return 1;
    visitingHeight.add(id);

    const node = nodesMap[id];
    if (!node) {
      visitingHeight.delete(id);
      return 0;
    }

    let maxChildH = 0;
    const hasChildren = Boolean(node.children && node.children.length > 0);
    if (hasChildren) {
      const validChildren = node.children!.filter((c) => allIds.has(c) && !visitingHeight.has(c));
      for (const ch of validChildren) {
        maxChildH = Math.max(maxChildH, calcSubtreeHeight(ch));
      }
    } else {
      const hL = node.left && allIds.has(node.left) && !visitingHeight.has(node.left) ? calcSubtreeHeight(node.left) : 0;
      const hR = node.right && allIds.has(node.right) && !visitingHeight.has(node.right) ? calcSubtreeHeight(node.right) : 0;
      maxChildH = Math.max(hL, hR);
    }

    const h = 1 + maxChildH;
    visitingHeight.delete(id);
    heights.set(id, h);
    return h;
  }

  let currentStartX = 60;
  for (const r of roots) {
    layoutBinarySubtree(r, currentStartX, 0);
    currentStartX += (subtreeWidths.get(r) || (NODE_WIDTH + NODE_GAP_X)) + 60;
  }

  // 3. Assemble layout nodes, curved connecting edges, and bounds
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
      parent: data.parent,
      height: data.height ?? calcSubtreeHeight(id),
      depth: depths.get(id) ?? 0,
      balanceFactor: data.balanceFactor,
      isWordEnd: data.isWordEnd,
      rank: data.rank,
    });

    if (data.children && data.children.length > 0) {
      for (const chId of data.children) {
        if (positions.has(chId) && data.parent !== chId) {
          const childPos = positions.get(chId)!;
          let edgeState: TreeEdgeState = 'default';
          if (data.state === 'active' || data.state === 'comparing') edgeState = 'active';

          layoutEdges.push({
            id: `e-${id}-${chId}`,
            from: id,
            to: chId,
            x1: pos.x,
            y1: pos.y + NODE_RADIUS,
            x2: childPos.x,
            y2: childPos.y - NODE_RADIUS,
            state: edgeState,
          });
        }
      }
    } else {
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
