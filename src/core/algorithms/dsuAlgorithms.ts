/**
 * Disjoint Set Union (DSU / Union-Find) Algorithms & Step Generators
 * Animates Union by Rank, Multi-Tree Forests, and Path Compression.
 */

import type { TreeNodeData, TreeStepSnapshot, DsuSetGroup } from '../../types/tree';

export function buildDsuForestNodes(
  parent: number[],
  rank: number[],
  activeNode: number | null = null,
  compressingNode: number | null = null
): { nodes: Record<string, TreeNodeData>; rootIds: string[] } {
  const nodes: Record<string, TreeNodeData> = {};
  const rootIds: string[] = [];

  for (let i = 0; i < parent.length; i++) {
    const id = `u${i}`;
    const pId = `u${parent[i]}`;
    const isRoot = parent[i] === i;
    if (isRoot) rootIds.push(id);

    let state: any = 'default';
    if (compressingNode === i) state = 'rotating';
    else if (activeNode === i) state = 'active';

    nodes[id] = {
      id,
      val: i,
      left: null,
      right: null,
      parent: isRoot ? null : pId,
      rank: rank[i],
      state,
    };
  }

  // Assign children to parents so tree layout can position subtrees
  for (let i = 0; i < parent.length; i++) {
    if (parent[i] !== i) {
      const pId = `u${parent[i]}`;
      const cId = `u${i}`;
      if (!nodes[pId].left) {
        nodes[pId].left = cId;
      } else if (!nodes[pId].right) {
        nodes[pId].right = cId;
      }
    }
  }

  return { nodes, rootIds };
}

function computeDsuGroups(parent: number[], rank: number[]): DsuSetGroup[] {
  const groups: Record<number, number[]> = {};
  for (let i = 0; i < parent.length; i++) {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    if (!groups[root]) groups[root] = [];
    groups[root].push(i);
  }

  return Object.entries(groups).map(([rootStr, members]) => {
    const root = Number(rootStr);
    return {
      rootId: `u${root}`,
      members: members.map((m) => `u${m}`),
      rank: rank[root],
    };
  });
}

/**
 * Generate step-by-step DSU Find with Path Compression
 */
export function generateDsuFindSteps(
  initialParent: number[],
  initialRank: number[],
  targetNode: number
): TreeStepSnapshot[] {
  const steps: TreeStepSnapshot[] = [];
  const parent = [...initialParent];
  const rank = [...initialRank];
  let stepCounter = 0;

  const path: number[] = [];
  let curr = targetNode;

  let { nodes, rootIds } = buildDsuForestNodes(parent, rank, curr);
  steps.push({
    stepIndex: stepCounter++,
    nodes,
    rootId: rootIds[0] || null,
    rootIds,
    pointers: [{ name: 'find', nodeId: `u${curr}`, color: '#38bdf8' }],
    action: `Find(Set of Node ${targetNode})`,
    explanation: `Starting search from node ${targetNode} to locate the root representative of its disjoint set.`,
    auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
  });

  // Climb up to root
  while (parent[curr] !== curr) {
    path.push(curr);
    curr = parent[curr];
    ({ nodes, rootIds } = buildDsuForestNodes(parent, rank, curr));
    steps.push({
      stepIndex: stepCounter++,
      nodes,
      rootId: rootIds[0] || null,
      rootIds,
      pointers: [{ name: 'climb', nodeId: `u${curr}`, color: '#38bdf8' }],
      action: `Climbing: Node points to Parent ${curr}`,
      explanation: `Tracing parent pointer upward to node ${curr}.`,
      auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
    });
  }

  const root = curr;
  ({ nodes, rootIds } = buildDsuForestNodes(parent, rank, root));
  steps.push({
    stepIndex: stepCounter++,
    nodes,
    rootId: rootIds[0] || null,
    rootIds,
    pointers: [{ name: 'root', nodeId: `u${root}`, color: '#10b981' }],
    action: `Found Root Representative: Node ${root}`,
    explanation: `Root of set is node ${root} (parent[${root}] == ${root}). Now initiating Path Compression.`,
    auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
  });

  // Path compression: flatten path directly to root
  for (const nodeOnPath of path) {
    if (parent[nodeOnPath] !== root) {
      const oldParent = parent[nodeOnPath];
      parent[nodeOnPath] = root;

      ({ nodes, rootIds } = buildDsuForestNodes(parent, rank, root, nodeOnPath));
      steps.push({
        stepIndex: stepCounter++,
        nodes,
        rootId: rootIds[0] || null,
        rootIds,
        pointers: [
          { name: 'compress', nodeId: `u${nodeOnPath}`, color: '#a855f7' },
          { name: 'root', nodeId: `u${root}`, color: '#10b981' },
        ],
        action: `Path Compression: Re-pointed Node ${nodeOnPath} $\\to$ Root ${root}`,
        explanation: `Flattened tree height! Re-wired parent of node ${nodeOnPath} directly to root ${root} (bypassing node ${oldParent}).`,
        auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
      });
    }
  }

  ({ nodes, rootIds } = buildDsuForestNodes(parent, rank));
  steps.push({
    stepIndex: stepCounter++,
    nodes,
    rootId: rootIds[0] || null,
    rootIds,
    pointers: [{ name: 'root', nodeId: `u${root}`, color: '#10b981' }],
    action: `Find(${targetNode}) Complete $\\to$ Root ${root}`,
    explanation: `Find returned root ${root}. Path compression ensures future queries run in nearly $O(1)$ amortized time.`,
    auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
  });

  return steps;
}

/**
 * Generate step-by-step DSU Union by Rank
 */
export function generateDsuUnionSteps(
  initialParent: number[],
  initialRank: number[],
  u: number,
  v: number
): TreeStepSnapshot[] {
  const steps: TreeStepSnapshot[] = [];
  const parent = [...initialParent];
  const rank = [...initialRank];
  let stepCounter = 0;

  let { nodes, rootIds } = buildDsuForestNodes(parent, rank, u);
  steps.push({
    stepIndex: stepCounter++,
    nodes,
    rootId: rootIds[0] || null,
    rootIds,
    pointers: [
      { name: 'u', nodeId: `u${u}`, color: '#38bdf8' },
      { name: 'v', nodeId: `u${v}`, color: '#a855f7' },
    ],
    action: `Union(Node ${u}, Node ${v})`,
    explanation: `Requested union of element ${u} and element ${v}. First finding roots of both elements.`,
    auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
  });

  // Find root of u
  let rootU = u;
  while (parent[rootU] !== rootU) rootU = parent[rootU];

  // Find root of v
  let rootV = v;
  while (parent[rootV] !== rootV) rootV = parent[rootV];

  if (rootU === rootV) {
    steps.push({
      stepIndex: stepCounter++,
      nodes,
      rootId: rootIds[0] || null,
      rootIds,
      pointers: [{ name: 'same_set', nodeId: `u${rootU}`, color: '#f59e0b' }],
      action: `Nodes ${u} and ${v} already in same set!`,
      explanation: `Both belong to root ${rootU}. Adding an edge between them would create a cycle!`,
      auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
    });
    return steps;
  }

  // Union by Rank
  steps.push({
    stepIndex: stepCounter++,
    nodes,
    rootId: rootIds[0] || null,
    rootIds,
    pointers: [
      { name: `root(${u})`, nodeId: `u${rootU}`, color: '#38bdf8' },
      { name: `root(${v})`, nodeId: `u${rootV}`, color: '#a855f7' },
    ],
    action: `Comparing Ranks: Rank(${rootU})=${rank[rootU]} vs Rank(${rootV})=${rank[rootV]}`,
    explanation: `To minimize tree depth, attach the root with lower rank under the root with higher rank.`,
    auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
  });

  if (rank[rootU] < rank[rootV]) {
    parent[rootU] = rootV;
    ({ nodes, rootIds } = buildDsuForestNodes(parent, rank, rootV));
    steps.push({
      stepIndex: stepCounter++,
      nodes,
      rootId: rootIds[0] || null,
      rootIds,
      pointers: [{ name: 'new_root', nodeId: `u${rootV}`, color: '#10b981' }],
      action: `Attached Root ${rootU} under Root ${rootV}`,
      explanation: `Rank(${rootU}) < Rank(${rootV}), so node ${rootU} points to ${rootV}. Rank of ${rootV} unchanged.`,
      auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
    });
  } else if (rank[rootU] > rank[rootV]) {
    parent[rootV] = rootU;
    ({ nodes, rootIds } = buildDsuForestNodes(parent, rank, rootU));
    steps.push({
      stepIndex: stepCounter++,
      nodes,
      rootId: rootIds[0] || null,
      rootIds,
      pointers: [{ name: 'new_root', nodeId: `u${rootU}`, color: '#10b981' }],
      action: `Attached Root ${rootV} under Root ${rootU}`,
      explanation: `Rank(${rootV}) < Rank(${rootU}), so node ${rootV} points to ${rootU}. Rank of ${rootU} unchanged.`,
      auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
    });
  } else {
    parent[rootV] = rootU;
    rank[rootU]++;
    ({ nodes, rootIds } = buildDsuForestNodes(parent, rank, rootU));
    steps.push({
      stepIndex: stepCounter++,
      nodes,
      rootId: rootIds[0] || null,
      rootIds,
      pointers: [{ name: 'new_root', nodeId: `u${rootU}`, color: '#10b981' }],
      action: `Equal Ranks: Attached ${rootV} to ${rootU} and Incremented Rank to ${rank[rootU]}`,
      explanation: `Both trees had rank ${rank[rootV]}. Attached ${rootV} under ${rootU} and increased Rank(${rootU}) to ${rank[rootU]}.`,
      auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
    });
  }

  ({ nodes, rootIds } = buildDsuForestNodes(parent, rank));
  steps.push({
    stepIndex: stepCounter++,
    nodes,
    rootId: rootIds[0] || null,
    rootIds,
    pointers: [],
    action: `Union Complete: Merged Sets!`,
    explanation: `Total disjoint sets reduced. New components: ${computeDsuGroups(parent, rank).length}.`,
    auxiliary: { dsuSets: computeDsuGroups(parent, rank) },
  });

  return steps;
}
