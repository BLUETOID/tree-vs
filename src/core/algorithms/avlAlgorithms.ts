/**
 * AVL Tree (Self-Balancing BST) Algorithms & Step Generators
 * Implements dynamic balance factors and animated single/double rotations: LL, RR, LR, RL.
 */

import type { TreeNodeData, TreeStepSnapshot } from '../../types/tree';

function cloneNodes(nodes: Record<string, TreeNodeData>): Record<string, TreeNodeData> {
  const copy: Record<string, TreeNodeData> = {};
  for (const [id, node] of Object.entries(nodes)) {
    copy[id] = { ...node };
  }
  return copy;
}

export function computeHeightsAndBF(
  nodes: Record<string, TreeNodeData>,
  nodeId: string | null
): number {
  if (!nodeId || !nodes[nodeId]) return 0;
  const leftH = computeHeightsAndBF(nodes, nodes[nodeId].left);
  const rightH = computeHeightsAndBF(nodes, nodes[nodeId].right);
  const h = 1 + Math.max(leftH, rightH);
  nodes[nodeId].height = h;
  nodes[nodeId].balanceFactor = leftH - rightH;
  return h;
}

export function generateAvlInsertSteps(
  initialNodes: Record<string, TreeNodeData>,
  rootId: string | null,
  valueToInsert: number
): TreeStepSnapshot[] {
  const steps: TreeStepSnapshot[] = [];
  let currentNodes = cloneNodes(initialNodes);
  let stepCounter = 0;

  computeHeightsAndBF(currentNodes, rootId);

  const newId = `node_${Date.now() % 100000}`;

  if (!rootId || !currentNodes[rootId]) {
    currentNodes[newId] = {
      id: newId,
      val: valueToInsert,
      left: null,
      right: null,
      parent: null,
      height: 1,
      balanceFactor: 0,
      state: 'inserting',
    };

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId: newId,
      pointers: [{ name: 'root', nodeId: newId, color: '#10b981' }],
      action: `Insert Root ${valueToInsert}`,
      explanation: `AVL tree was empty. Created root node ${valueToInsert} with balance factor 0.`,
      auxiliary: { rotationType: undefined },
    });
    return steps;
  }

  // 1. Standard BST insertion path
  let currId: string | null = rootId;
  const path: string[] = [];

  while (currId) {
    path.push(currId);
    const node: TreeNodeData = currentNodes[currId];
    const val = Number(node.val);
    currentNodes[currId].state = 'comparing';

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [{ name: 'curr', nodeId: currId, color: '#38bdf8' }],
      action: `Compare ${valueToInsert} with ${val}`,
      explanation: `Searching for insertion spot in AVL tree. Value: ${val}, Height: ${node.height}, BF: ${node.balanceFactor}.`,
      auxiliary: {},
    });

    currentNodes[currId].state = 'default';
    if (valueToInsert < val) {
      if (!node.left) break;
      currId = node.left;
    } else if (valueToInsert > val) {
      if (!node.right) break;
      currId = node.right;
    } else {
      steps.push({
        stepIndex: stepCounter++,
        nodes: cloneNodes(currentNodes),
        rootId,
        pointers: [{ name: 'duplicate', nodeId: currId, color: '#f59e0b' }],
        action: `Value ${valueToInsert} Already Exists`,
        explanation: 'AVL trees do not insert duplicate keys.',
        auxiliary: {},
      });
      return steps;
    }
  }

  const parentId = currId!;
  const isLeft = valueToInsert < Number(currentNodes[parentId].val);

  currentNodes[newId] = {
    id: newId,
    val: valueToInsert,
    left: null,
    right: null,
    parent: parentId,
    height: 1,
    balanceFactor: 0,
    state: 'inserting',
  };

  if (isLeft) currentNodes[parentId].left = newId;
  else currentNodes[parentId].right = newId;

  computeHeightsAndBF(currentNodes, rootId);

  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [
      { name: 'new', nodeId: newId, color: '#10b981' },
      { name: 'parent', nodeId: parentId, color: '#a855f7' },
    ],
    action: `Inserted Node ${valueToInsert}`,
    explanation: `Attached node ${valueToInsert} as ${isLeft ? 'left' : 'right'} child of ${currentNodes[parentId].val}. Now checking ancestors for AVL balance.`,
    auxiliary: {},
  });

  currentNodes[newId].state = 'default';

  // 2. Walk up ancestors and recompute balance factor; find first imbalanced node
  let imbalancedNodeId: string | null = null;
  let currentRoot = rootId;

  for (let idx = path.length - 1; idx >= 0; idx--) {
    const ancestorId = path[idx];
    computeHeightsAndBF(currentNodes, currentRoot);
    const bf = currentNodes[ancestorId].balanceFactor || 0;

    currentNodes[ancestorId].state = 'comparing';
    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId: currentRoot,
      pointers: [{ name: 'check_bf', nodeId: ancestorId, color: '#38bdf8' }],
      action: `Check Balance: Node ${currentNodes[ancestorId].val} (BF = ${bf})`,
      explanation: `Ancestor node ${currentNodes[ancestorId].val} has Height = ${currentNodes[ancestorId].height}, Balance Factor = ${bf} (Left H - Right H).`,
      auxiliary: {},
    });

    currentNodes[ancestorId].state = 'default';

    if (Math.abs(bf) > 1) {
      imbalancedNodeId = ancestorId;
      break;
    }
  }

  // If balanced, we are done
  if (!imbalancedNodeId) {
    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId: currentRoot,
      pointers: [{ name: 'balanced', nodeId: currentRoot, color: '#10b981' }],
      action: 'AVL Tree is Balanced',
      explanation: 'All ancestor balance factors are within [-1, 0, 1]. No rotations required.',
      auxiliary: {},
    });
    return steps;
  }

  // 3. Imbalance detected! Determine rotation type: LL, RR, LR, RL
  const z = imbalancedNodeId;
  const zBF = currentNodes[z].balanceFactor || 0;
  let rotationType: 'LL' | 'RR' | 'LR' | 'RL' = 'LL';

  currentNodes[z].state = 'rotating';

  if (zBF > 1) {
    // Left heavy
    const y = currentNodes[z].left!;
    const yBF = currentNodes[y].balanceFactor || 0;
    if (yBF >= 0) {
      rotationType = 'LL';
    } else {
      rotationType = 'LR';
    }
  } else {
    // Right heavy
    const y = currentNodes[z].right!;
    const yBF = currentNodes[y].balanceFactor || 0;
    if (yBF <= 0) {
      rotationType = 'RR';
    } else {
      rotationType = 'RL';
    }
  }

  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId: currentRoot,
    pointers: [{ name: 'imbalance', nodeId: z, color: '#f43f5e' }],
    action: `Imbalance Detected at Node ${currentNodes[z].val}! BF = ${zBF} (${rotationType} Case)`,
    explanation: `Node ${currentNodes[z].val} violates AVL condition (|BF| > 1). Initiating ${rotationType} rotation.`,
    auxiliary: { rotationType },
  });

  // Helper: Right Rotation on node n
  function rotateRight(nodeId: string): string {
    const p = currentNodes[nodeId];
    const leftChildId = p.left!;
    const leftChild = currentNodes[leftChildId];
    const parentOfP = p.parent;

    p.left = leftChild.right;
    if (leftChild.right && currentNodes[leftChild.right]) {
      currentNodes[leftChild.right].parent = nodeId;
    }

    leftChild.right = nodeId;
    p.parent = leftChildId;
    leftChild.parent = parentOfP;

    if (parentOfP && currentNodes[parentOfP]) {
      if (currentNodes[parentOfP].left === nodeId) {
        currentNodes[parentOfP].left = leftChildId;
      } else {
        currentNodes[parentOfP].right = leftChildId;
      }
    }

    return leftChildId;
  }

  // Helper: Left Rotation on node n
  function rotateLeft(nodeId: string): string {
    const p = currentNodes[nodeId];
    const rightChildId = p.right!;
    const rightChild = currentNodes[rightChildId];
    const parentOfP = p.parent;

    p.right = rightChild.left;
    if (rightChild.left && currentNodes[rightChild.left]) {
      currentNodes[rightChild.left].parent = nodeId;
    }

    rightChild.left = nodeId;
    p.parent = rightChildId;
    rightChild.parent = parentOfP;

    if (parentOfP && currentNodes[parentOfP]) {
      if (currentNodes[parentOfP].left === nodeId) {
        currentNodes[parentOfP].left = rightChildId;
      } else {
        currentNodes[parentOfP].right = rightChildId;
      }
    }

    return rightChildId;
  }

  let newSubtreeRoot = z;

  if (rotationType === 'LL') {
    newSubtreeRoot = rotateRight(z);
  } else if (rotationType === 'RR') {
    newSubtreeRoot = rotateLeft(z);
  } else if (rotationType === 'LR') {
    const leftChild = currentNodes[z].left!;
    rotateLeft(leftChild);
    computeHeightsAndBF(currentNodes, currentRoot);
    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId: currentRoot,
      pointers: [{ name: 'step1', nodeId: leftChild, color: '#a855f7' }],
      action: 'LR Step 1: Left Rotation on Left Child',
      explanation: `Performed preliminary left rotation on node ${currentNodes[leftChild].val} to transform LR into LL case.`,
      auxiliary: { rotationType: 'LR' },
    });
    newSubtreeRoot = rotateRight(z);
  } else if (rotationType === 'RL') {
    const rightChild = currentNodes[z].right!;
    rotateRight(rightChild);
    computeHeightsAndBF(currentNodes, currentRoot);
    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId: currentRoot,
      pointers: [{ name: 'step1', nodeId: rightChild, color: '#a855f7' }],
      action: 'RL Step 1: Right Rotation on Right Child',
      explanation: `Performed preliminary right rotation on node ${currentNodes[rightChild].val} to transform RL into RR case.`,
      auxiliary: { rotationType: 'RL' },
    });
    newSubtreeRoot = rotateLeft(z);
  }

  if (z === currentRoot) {
    currentRoot = newSubtreeRoot;
  }

  computeHeightsAndBF(currentNodes, currentRoot);
  for (const n of Object.values(currentNodes)) {
    n.state = 'default';
  }
  currentNodes[newSubtreeRoot].state = 'found';

  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId: currentRoot,
    pointers: [{ name: 'pivot', nodeId: newSubtreeRoot, color: '#10b981' }],
    action: `${rotationType} Rotation Completed Successfully!`,
    explanation: `Subtree re-balanced! Node ${currentNodes[newSubtreeRoot].val} is now the new root with BF = ${currentNodes[newSubtreeRoot].balanceFactor}.`,
    auxiliary: { rotationType },
  });

  currentNodes[newSubtreeRoot].state = 'default';
  return steps;
}
