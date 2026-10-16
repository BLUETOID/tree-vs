/**
 * Tree Traversals & Step Generators: Pre-order, In-order, Post-order, and BFS Level-Order
 */

import type { TreeNodeData, TreeStepSnapshot, CallStackFrame } from '../../types/tree';

function cloneNodes(nodes: Record<string, TreeNodeData>): Record<string, TreeNodeData> {
  const copy: Record<string, TreeNodeData> = {};
  for (const [id, node] of Object.entries(nodes)) {
    copy[id] = { ...node };
  }
  return copy;
}

export type TraversalType = 'preorder' | 'inorder' | 'postorder' | 'levelorder';

export function generateTraversalSteps(
  initialNodes: Record<string, TreeNodeData>,
  rootId: string | null,
  type: TraversalType
): TreeStepSnapshot[] {
  const steps: TreeStepSnapshot[] = [];
  if (!rootId || !initialNodes[rootId]) return steps;

  let currentNodes = cloneNodes(initialNodes);
  let stepCounter = 0;
  const traversalOutput: (number | string)[] = [];

  if (type === 'levelorder') {
    // BFS Level-Order Traversal using Queue
    const queue: string[] = [rootId];
    currentNodes[rootId].state = 'active';

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [{ name: 'queue.front', nodeId: rootId, color: '#38bdf8' }],
      action: `Initialize BFS: Enqueued Root ${currentNodes[rootId].val}`,
      explanation: `Pushed root node to the FIFO queue. Beginning level-order exploration.`,
      auxiliary: {
        queue: queue.map((id) => currentNodes[id]?.val),
        traversalOutput: [...traversalOutput],
      },
    });

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const currNode = currentNodes[currId];
      currNode.state = 'found';
      traversalOutput.push(currNode.val);

      steps.push({
        stepIndex: stepCounter++,
        nodes: cloneNodes(currentNodes),
        rootId,
        pointers: [{ name: 'visiting', nodeId: currId, color: '#10b981' }],
        action: `Dequeued & Visited Node ${currNode.val}`,
        explanation: `Popped node ${currNode.val} from queue. Added to visited sequence.`,
        auxiliary: {
          queue: queue.map((id) => currentNodes[id]?.val),
          traversalOutput: [...traversalOutput],
        },
      });

      if (currNode.left && currentNodes[currNode.left]) {
        queue.push(currNode.left);
        currentNodes[currNode.left].state = 'active';
        steps.push({
          stepIndex: stepCounter++,
          nodes: cloneNodes(currentNodes),
          rootId,
          pointers: [
            { name: 'curr', nodeId: currId, color: '#10b981' },
            { name: 'enqueue_left', nodeId: currNode.left, color: '#38bdf8' },
          ],
          action: `Enqueued Left Child: ${currentNodes[currNode.left].val}`,
          explanation: `Discovered left child of ${currNode.val}. Added to queue.`,
          auxiliary: {
            queue: queue.map((id) => currentNodes[id]?.val),
            traversalOutput: [...traversalOutput],
          },
        });
      }

      if (currNode.right && currentNodes[currNode.right]) {
        queue.push(currNode.right);
        currentNodes[currNode.right].state = 'active';
        steps.push({
          stepIndex: stepCounter++,
          nodes: cloneNodes(currentNodes),
          rootId,
          pointers: [
            { name: 'curr', nodeId: currId, color: '#10b981' },
            { name: 'enqueue_right', nodeId: currNode.right, color: '#38bdf8' },
          ],
          action: `Enqueued Right Child: ${currentNodes[currNode.right].val}`,
          explanation: `Discovered right child of ${currNode.val}. Added to queue.`,
          auxiliary: {
            queue: queue.map((id) => currentNodes[id]?.val),
            traversalOutput: [...traversalOutput],
          },
        });
      }
    }

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [],
      action: 'Level-Order Traversal Complete!',
      explanation: `Finished traversing all nodes level by level. Final visited order: [${traversalOutput.join(', ')}].`,
      auxiliary: {
        queue: [],
        traversalOutput: [...traversalOutput],
      },
    });

    return steps;
  }

  // DFS Traversals: Pre-order, In-order, Post-order
  const callStack: CallStackFrame[] = [];

  function dfs(nodeId: string | null) {
    if (!nodeId || !currentNodes[nodeId]) {
      return;
    }

    const val = currentNodes[nodeId].val;
    const frameId = `f_${stepCounter}`;
    callStack.push({
      id: frameId,
      functionName: `traverse(${val})`,
      args: { val, node: nodeId },
      status: 'active',
    });

    currentNodes[nodeId].state = 'active';
    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [{ name: 'call', nodeId, color: '#38bdf8' }],
      action: `Call traverse(Node ${val})`,
      explanation: `Pushed call frame for node ${val} to recursive call stack.`,
      auxiliary: {
        callStack: [...callStack],
        traversalOutput: [...traversalOutput],
      },
    });

    // 1. Visit if Pre-order
    if (type === 'preorder') {
      currentNodes[nodeId].state = 'found';
      traversalOutput.push(val);
      steps.push({
        stepIndex: stepCounter++,
        nodes: cloneNodes(currentNodes),
        rootId,
        pointers: [{ name: 'visit', nodeId, color: '#10b981' }],
        action: `Pre-order Visit: ${val}`,
        explanation: `Root processed before children. Added ${val} to output.`,
        auxiliary: {
          callStack: [...callStack],
          traversalOutput: [...traversalOutput],
        },
      });
    }

    // 2. Left Subtree
    if (currentNodes[nodeId].left) {
      dfs(currentNodes[nodeId].left);
    }

    // 3. Visit if In-order
    if (type === 'inorder') {
      currentNodes[nodeId].state = 'found';
      traversalOutput.push(val);
      steps.push({
        stepIndex: stepCounter++,
        nodes: cloneNodes(currentNodes),
        rootId,
        pointers: [{ name: 'visit', nodeId, color: '#10b981' }],
        action: `In-order Visit: ${val}`,
        explanation: `Left subtree finished. Processed node ${val}.`,
        auxiliary: {
          callStack: [...callStack],
          traversalOutput: [...traversalOutput],
        },
      });
    }

    // 4. Right Subtree
    if (currentNodes[nodeId].right) {
      dfs(currentNodes[nodeId].right);
    }

    // 5. Visit if Post-order
    if (type === 'postorder') {
      currentNodes[nodeId].state = 'found';
      traversalOutput.push(val);
      steps.push({
        stepIndex: stepCounter++,
        nodes: cloneNodes(currentNodes),
        rootId,
        pointers: [{ name: 'visit', nodeId, color: '#10b981' }],
        action: `Post-order Visit: ${val}`,
        explanation: `Both subtrees completed. Processed node ${val}.`,
        auxiliary: {
          callStack: [...callStack],
          traversalOutput: [...traversalOutput],
        },
      });
    }

    // Unwind call stack
    const popped = callStack.pop();
    if (popped) popped.status = 'returning';

    steps.push({
      stepIndex: stepCounter++,
      nodes: cloneNodes(currentNodes),
      rootId,
      pointers: [{ name: 'return', nodeId, color: '#a855f7' }],
      action: `Return from traverse(Node ${val})`,
      explanation: `Frame unwound. Returning execution control to caller.`,
      auxiliary: {
        callStack: [...callStack],
        traversalOutput: [...traversalOutput],
      },
    });
  }

  dfs(rootId);

  steps.push({
    stepIndex: stepCounter++,
    nodes: cloneNodes(currentNodes),
    rootId,
    pointers: [],
    action: `${type.toUpperCase()} Traversal Complete!`,
    explanation: `All nodes visited. Final sequence: [${traversalOutput.join(', ')}].`,
    auxiliary: {
      callStack: [],
      traversalOutput: [...traversalOutput],
    },
  });

  return steps;
}
