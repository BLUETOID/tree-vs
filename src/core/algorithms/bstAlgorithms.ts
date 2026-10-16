/**
 * Binary Search Tree (BST) Algorithms & Step Generators
 */

import type { TreeNodeData, TreeStepSnapshot, PointerMarker } from '../../types/tree';

/**
 * Parses LeetCode serialized array e.g. [4, 2, 7, 1, 3, null, 5] into node map
 */
export function buildTreeFromLeetCodeArray(
  arr: (number | string | null)[]
): { nodes: Record<string, TreeNodeData>; rootId: string | null } {
  if (!arr || arr.length === 0 || arr[0] === null || arr[0] === undefined) {
    return { nodes: {}, rootId: null };
  }

  const nodes: Record<string, TreeNodeData> = {};
  const rootId = 'n0';
  nodes[rootId] = {
    id: rootId,
    val: arr[0],
    left: null,
    right: null,
    parent: null,
    state: 'default',
  };

  const queue: string[] = [rootId];
  let i = 1;

  while (queue.length > 0 && i < arr.length) {
    const parentId = queue.shift()!;

    // Left child
    if (i < arr.length) {
      const leftVal = arr[i];
      if (leftVal !== null && leftVal !== undefined) {
        const leftId = `n${i}`;
        nodes[leftId] = {
          id: leftId,
          val: leftVal,
          left: null,
          right: null,
          parent: parentId,
          state: 'default',
        };
        nodes[parentId].left = leftId;
        queue.push(leftId);
      }
      i++;
    }

    // Right child
    if (i < arr.length) {
      const rightVal = arr[i];
      if (rightVal !== null && rightVal !== undefined) {
        const rightId = `n${i}`;
        nodes[rightId] = {
          id: rightId,
          val: rightVal,
          left: null,
          right: null,
          parent: parentId,
          state: 'default',
        };
        nodes[parentId].right = rightId;
        queue.push(rightId);
      }
      i++;
    }
  }

  return { nodes, rootId };
}

function cloneNodes(nodes: Record<string, TreeNodeData>): Record<string, TreeNodeData> {
  const copy: Record<string, TreeNodeData> = {};
  for (const [id, node] of Object.entries(nodes)) {
    copy[id] = { ...node };
  }
  return copy;
}

/**
 * Generates step-by-step BST Search animation timeline
 */
export function generateBstSearchSteps(
  initialNodes: Record<string, TreeNodeData>,
  rootId: string | null,
  target: number
): TreeStepSnapshot[] {
  const steps: TreeStepSnapshot[] = [];
  let currentNodes = cloneNodes(initialNodes);

  if (!rootId || !currentNodes[rootId]) {
    steps.push({
      stepIndex: 0,
      nodes: currentNodes,
      rootId,
      pointers: [],
      action: 'Search in empty tree',
      explanation: `Tree is empty. Cannot search for target ${target}.`,
      auxiliary: {},
    });
    return steps;
  }

  let currId: string | null = rootId;
  let stepCounter = 0;

  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [{ name: 'curr', nodeId: currId, color: '#38bdf8' }],
    action: `Start Search for ${target}`,
    explanation: `Beginning search at root node (value: ${currentNodes[currId].val}).`,
    auxiliary: {},
  });

  while (currId) {
    const node: TreeNodeData = currentNodes[currId];
    const val = Number(node.val);

    // Highlight active node
    currentNodes[currId].state = 'comparing';
    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [{ name: 'curr', nodeId: currId, color: '#38bdf8' }],
      action: `Comparing ${target} with ${val}`,
      explanation: `Checking current node ${currId} with value ${val}. Target is ${target}.`,
      auxiliary: {},
    });

    if (val === target) {
      currentNodes[currId].state = 'found';
      steps.push({
        stepIndex: stepCounter++,
        nodes: cloneNodes(currentNodes),
        rootId,
        pointers: [{ name: 'found', nodeId: currId, color: '#10b981' }],
        action: `Found Target ${target}!`,
        explanation: `Target value ${target} successfully located at node ${currId}!`,
        auxiliary: {},
      });
      return steps;
    } else if (target < val) {
      currentNodes[currId].state = 'default';
      const nextId: string | null = node.left;
      steps.push({
        stepIndex: stepCounter++,
        nodes: cloneNodes(currentNodes),
        rootId,
        pointers: [{ name: 'curr', nodeId: currId, color: '#38bdf8' }],
        action: `${target} < ${val} → Go Left`,
        explanation: `Since ${target} is less than ${val}, follow the left pointer.`,
        auxiliary: {},
      });
      currId = nextId;
    } else {
      currentNodes[currId].state = 'default';
      const nextId: string | null = node.right;
      steps.push({
        stepIndex: stepCounter++,
        nodes: cloneNodes(currentNodes),
        rootId,
        pointers: [{ name: 'curr', nodeId: currId, color: '#38bdf8' }],
        action: `${target} > ${val} → Go Right`,
        explanation: `Since ${target} is greater than ${val}, follow the right pointer.`,
        auxiliary: {},
      });
      currId = nextId;
    }
  }

  // Target not found
  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [{ name: 'null', nodeId: null, color: '#f43f5e' }],
    action: `Target ${target} Not Found`,
    explanation: `Reached a null pointer. Target value ${target} does not exist in the BST.`,
    auxiliary: {},
  });

  return steps;
}

/**
 * Generates step-by-step BST Insert animation timeline
 */
export function generateBstInsertSteps(
  initialNodes: Record<string, TreeNodeData>,
  rootId: string | null,
  valueToInsert: number
): TreeStepSnapshot[] {
  const steps: TreeStepSnapshot[] = [];
  let currentNodes = cloneNodes(initialNodes);
  let stepCounter = 0;

  const newId = `node_${Date.now() % 100000}`;

  if (!rootId || !currentNodes[rootId]) {
    currentNodes[newId] = {
      id: newId,
      val: valueToInsert,
      left: null,
      right: null,
      parent: null,
      state: 'inserting',
    };

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId: newId,
      pointers: [{ name: 'root', nodeId: newId, color: '#10b981' }],
      action: `Insert Root ${valueToInsert}`,
      explanation: `Tree was empty. Created node ${newId} with value ${valueToInsert} as new root.`,
      auxiliary: {},
    });
    return steps;
  }

  let currId: string | null = rootId;
  let parentId: string | null = null;
  let isLeftChild = false;

  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [{ name: 'curr', nodeId: currId, color: '#38bdf8' }],
    action: `Insert ${valueToInsert}`,
    explanation: `Searching for appropriate insertion position for value ${valueToInsert}.`,
    auxiliary: {},
  });

  while (currId) {
    parentId = currId;
    const node: TreeNodeData = currentNodes[currId];
    const val = Number(node.val);

    currentNodes[currId].state = 'comparing';
    const pointers: PointerMarker[] = [
      { name: 'curr', nodeId: currId, color: '#38bdf8' },
    ];
    if (parentId && parentId !== currId) {
      pointers.push({ name: 'parent', nodeId: parentId, color: '#a855f7' });
    }

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers,
      action: `Compare ${valueToInsert} with ${val}`,
      explanation: `Comparing new value ${valueToInsert} against current node value ${val}.`,
      auxiliary: {},
    });

    if (valueToInsert < val) {
      currentNodes[currId].state = 'default';
      isLeftChild = true;
      if (!node.left) {
        break; // found insertion spot
      }
      currId = node.left;
    } else if (valueToInsert > val) {
      currentNodes[currId].state = 'default';
      isLeftChild = false;
      if (!node.right) {
        break; // found insertion spot
      }
      currId = node.right;
    } else {
      currentNodes[currId].state = 'found';
      steps.push({
        stepIndex: stepCounter++,
        nodes: cloneNodes(currentNodes),
        rootId,
        pointers: [{ name: 'duplicate', nodeId: currId, color: '#f59e0b' }],
        action: `Value ${valueToInsert} already exists`,
        explanation: `BST typically ignores duplicates or updates node metadata.`,
        auxiliary: {},
      });
      return steps;
    }
  }

  // Create and link new node
  currentNodes[newId] = {
    id: newId,
    val: valueToInsert,
    left: null,
    right: null,
    parent: parentId,
    state: 'inserting',
  };

  if (parentId) {
    if (isLeftChild) {
      currentNodes[parentId].left = newId;
    } else {
      currentNodes[parentId].right = newId;
    }
  }

  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [
      { name: 'new', nodeId: newId, color: '#10b981' },
      { name: 'parent', nodeId: parentId, color: '#a855f7' },
    ],
    action: `Linked Node ${valueToInsert} to ${isLeftChild ? 'Left' : 'Right'} of ${parentId}`,
    explanation: `Successfully created and attached node ${newId} (value: ${valueToInsert}) as the ${isLeftChild ? 'left' : 'right'} child of node ${parentId}.`,
    auxiliary: {},
  });

  currentNodes[newId].state = 'default';
  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [{ name: 'inserted', nodeId: newId, color: '#10b981' }],
    action: 'Insertion Complete',
    explanation: `Tree structure updated and BST invariants preserved.`,
    auxiliary: {},
  });

  return steps;
}

/**
 * Generates step-by-step BST Delete animation timeline (covering all 3 cases)
 */
export function generateBstDeleteSteps(
  initialNodes: Record<string, TreeNodeData>,
  rootId: string | null,
  valueToDelete: number
): TreeStepSnapshot[] {
  const steps: TreeStepSnapshot[] = [];
  let currentNodes = cloneNodes(initialNodes);
  let stepCounter = 0;

  if (!rootId || !currentNodes[rootId]) {
    steps.push({
      stepIndex: 0,
      nodes: currentNodes,
      rootId,
      pointers: [],
      action: 'Delete in empty tree',
      explanation: 'Tree is empty. Cannot delete.',
      auxiliary: {},
    });
    return steps;
  }

  // 1. Locate node to delete
  let currId: string | null = rootId;
  let parentId: string | null = null;

  while (currId && Number(currentNodes[currId].val) !== valueToDelete) {
    parentId = currId;
    const val = Number(currentNodes[currId].val);
    currentNodes[currId].state = 'comparing';

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [{ name: 'curr', nodeId: currId, color: '#38bdf8' }],
      action: `Locating ${valueToDelete}`,
      explanation: `Comparing target ${valueToDelete} with node ${val}.`,
      auxiliary: {},
    });

    currentNodes[currId].state = 'default';
    if (valueToDelete < val) {
      currId = currentNodes[currId].left;
    } else {
      currId = currentNodes[currId].right;
    }
  }

  if (!currId) {
    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [],
      action: `Value ${valueToDelete} Not Found`,
      explanation: `Cannot delete value ${valueToDelete} because it does not exist in the BST.`,
      auxiliary: {},
    });
    return steps;
  }

  const targetNode = currentNodes[currId];
  targetNode.state = 'deleted';

  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [{ name: 'delete', nodeId: currId, color: '#f43f5e' }],
    action: `Target Node Located: ${valueToDelete}`,
    explanation: `Found node ${currId} with value ${valueToDelete}. Determining deletion case.`,
    auxiliary: {},
  });

  // Case 1: Leaf node (no children)
  if (!targetNode.left && !targetNode.right) {
    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [{ name: 'leaf', nodeId: currId, color: '#f43f5e' }],
      action: 'Case 1: Leaf Node Deletion',
      explanation: `Node ${currId} has no children. Simply sever parent link and remove node.`,
      auxiliary: {},
    });

    if (parentId) {
      if (currentNodes[parentId].left === currId) currentNodes[parentId].left = null;
      else if (currentNodes[parentId].right === currId) currentNodes[parentId].right = null;
    }
    delete currentNodes[currId];
    const newRootId = currId === rootId ? null : rootId;

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId: newRootId,
      pointers: [],
      action: 'Leaf Node Removed',
      explanation: `Node ${currId} deleted successfully.`,
      auxiliary: {},
    });
    return steps;
  }

  // Case 2: One child (only left or only right)
  if (!targetNode.left || !targetNode.right) {
    const childId = targetNode.left || targetNode.right;
    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [
        { name: 'delete', nodeId: currId, color: '#f43f5e' },
        { name: 'child', nodeId: childId, color: '#10b981' },
      ],
      action: 'Case 2: Node with Single Child',
      explanation: `Node ${currId} has one child (${childId}). Bypass node ${currId} and attach child directly to parent.`,
      auxiliary: {},
    });

    if (parentId) {
      if (currentNodes[parentId].left === currId) currentNodes[parentId].left = childId;
      else if (currentNodes[parentId].right === currId) currentNodes[parentId].right = childId;
      if (childId && currentNodes[childId]) currentNodes[childId].parent = parentId;
    }
    delete currentNodes[currId];
    const newRootId = currId === rootId ? childId : rootId;

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId: newRootId,
      pointers: [{ name: 'relinked', nodeId: childId, color: '#10b981' }],
      action: 'Single-Child Node Spliced Out',
      explanation: `Node ${currId} removed. Child ${childId} promoted to its place.`,
      auxiliary: {},
    });
    return steps;
  }

  // Case 3: Two children (find in-order successor = min in right subtree)
  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [{ name: 'delete', nodeId: currId, color: '#f43f5e' }],
    action: 'Case 3: Node with Two Children',
    explanation: `Node ${currId} has two children. Finding in-order successor (smallest node in right subtree).`,
    auxiliary: {},
  });

  let successorParentId = currId;
  let successorId = targetNode.right!;
  while (currentNodes[successorId].left) {
    successorParentId = successorId;
    successorId = currentNodes[successorId].left!;
  }

  const successor = currentNodes[successorId];
  successor.state = 'found';

  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [
      { name: 'delete', nodeId: currId, color: '#f43f5e' },
      { name: 'successor', nodeId: successorId, color: '#10b981' },
    ],
    action: `Found In-Order Successor: ${successor.val}`,
    explanation: `In-order successor is node ${successorId} with value ${successor.val}. Copy its value into node ${currId}.`,
    auxiliary: {},
  });

  // Copy successor value
  currentNodes[currId].val = successor.val;
  currentNodes[currId].state = 'default';

  // Remove successor node
  if (successorParentId === currId) {
    currentNodes[currId].right = successor.right;
  } else {
    currentNodes[successorParentId].left = successor.right;
  }
  if (successor.right && currentNodes[successor.right]) {
    currentNodes[successor.right].parent = successorParentId;
  }
  delete currentNodes[successorId];

  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [{ name: 'updated', nodeId: currId, color: '#10b981' }],
    action: 'Successor Copied & Removed',
    explanation: `Node value replaced with in-order successor ${successor.val}, and successor node was cleanly excised.`,
    auxiliary: {},
  });

  return steps;
}

/**
 * Generates step-by-step Invert Binary Tree animation timeline (LeetCode 226)
 */
export function generateTreeInvertSteps(
  initialNodes: Record<string, TreeNodeData>,
  rootId: string | null
): TreeStepSnapshot[] {
  const steps: TreeStepSnapshot[] = [];
  let currentNodes = cloneNodes(initialNodes);
  let stepCounter = 0;

  if (!rootId || !currentNodes[rootId]) {
    return steps;
  }

  function invert(nodeId: string | null) {
    if (!nodeId || !currentNodes[nodeId]) return;

    currentNodes[nodeId].state = 'rotating';
    const leftId = currentNodes[nodeId].left;
    const rightId = currentNodes[nodeId].right;

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [{ name: 'invert', nodeId, color: '#a855f7' }],
      action: `Inverting Node ${currentNodes[nodeId].val}`,
      explanation: `Swapping left pointer (${leftId ? currentNodes[leftId]?.val : 'null'}) and right pointer (${rightId ? currentNodes[rightId]?.val : 'null'}).`,
      auxiliary: {},
    });

    // Swap pointers
    currentNodes[nodeId].left = rightId;
    currentNodes[nodeId].right = leftId;

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [{ name: 'swapped', nodeId, color: '#10b981' }],
      action: `Swapped Children of ${currentNodes[nodeId].val}`,
      explanation: `Children of node ${currentNodes[nodeId].val} have been inverted.`,
      auxiliary: {},
    });

    currentNodes[nodeId].state = 'default';
    invert(rightId); // was left before swap
    invert(leftId);  // was right before swap
  }

  invert(rootId);

  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [{ name: 'root', nodeId: rootId, color: '#10b981' }],
    action: 'Inversion Complete',
    explanation: 'All subtrees in the binary tree have been mirrored.',
    auxiliary: {},
  });

  return steps;
}
