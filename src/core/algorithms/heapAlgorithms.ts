/**
 * Binary Heap (Min-Heap & Max-Heap) Algorithms & Step Generators
 * Synchronizes Hierarchical Tree View with Contiguous Array View.
 */

import type { TreeNodeData, TreeStepSnapshot, HeapArrayItem } from '../../types/tree';

export function buildTreeFromHeapArray(
  arr: number[],
  activeIndices: number[] = [],
  swappingIndices: number[] = []
): { nodes: Record<string, TreeNodeData>; rootId: string | null } {
  if (arr.length === 0) return { nodes: {}, rootId: null };

  const nodes: Record<string, TreeNodeData> = {};
  const rootId = 'h0';

  for (let i = 0; i < arr.length; i++) {
    const id = `h${i}`;
    const leftIdx = 2 * i + 1;
    const rightIdx = 2 * i + 2;
    const parentIdx = Math.floor((i - 1) / 2);

    let state: any = 'default';
    if (swappingIndices.includes(i)) state = 'swapping';
    else if (activeIndices.includes(i)) state = 'comparing';

    nodes[id] = {
      id,
      val: arr[i],
      left: leftIdx < arr.length ? `h${leftIdx}` : null,
      right: rightIdx < arr.length ? `h${rightIdx}` : null,
      parent: i > 0 ? `h${parentIdx}` : null,
      state,
    };
  }

  return { nodes, rootId };
}

function createHeapArrayItems(
  arr: number[],
  activeIndices: number[] = [],
  swappingIndices: number[] = []
): HeapArrayItem[] {
  return arr.map((val, index) => {
    let state: any = 'default';
    if (swappingIndices.includes(index)) state = 'swapping';
    else if (activeIndices.includes(index)) state = 'comparing';
    return {
      index,
      val,
      nodeId: `h${index}`,
      state,
    };
  });
}

/**
 * Generate step-by-step Heap Insert timeline with Swim (Bubble-up)
 */
export function generateHeapInsertSteps(
  initialArr: number[],
  valToInsert: number,
  isMinHeap: boolean = true
): TreeStepSnapshot[] {
  const steps: TreeStepSnapshot[] = [];
  const arr = [...initialArr];
  let stepCounter = 0;

  // 1. Append value to end of array / bottom level of tree
  const insertIndex = arr.length;
  arr.push(valToInsert);

  let { nodes, rootId } = buildTreeFromHeapArray(arr, [insertIndex]);
  steps.push({
    stepIndex: stepCounter++,
    nodes,
    rootId,
    pointers: [{ name: 'new', nodeId: `h${insertIndex}`, color: '#10b981' }],
    action: `Appended ${valToInsert} at index [${insertIndex}]`,
    explanation: `Inserted ${valToInsert} at the first available complete tree position (index ${insertIndex}). Now checking heap property with parent.`,
    auxiliary: {
      heapArray: createHeapArrayItems(arr, [insertIndex]),
    },
  });

  // 2. Swim / Bubble up
  let curr = insertIndex;
  while (curr > 0) {
    const parent = Math.floor((curr - 1) / 2);
    const currVal = arr[curr];
    const parentVal = arr[parent];

    // Highlight comparison
    ({ nodes, rootId } = buildTreeFromHeapArray(arr, [curr, parent]));
    const condition = isMinHeap ? currVal < parentVal : currVal > parentVal;

    steps.push({
      stepIndex: stepCounter++,
      nodes,
      rootId,
      pointers: [
        { name: 'curr', nodeId: `h${curr}`, color: '#38bdf8' },
        { name: 'parent', nodeId: `h${parent}`, color: '#a855f7' },
      ],
      action: `Compare child ${currVal} [${curr}] with parent ${parentVal} [${parent}]`,
      explanation: isMinHeap
        ? `${currVal} ${currVal < parentVal ? '<' : '>='} parent ${parentVal}. ${condition ? 'Violation! Needs swim-up.' : 'Min-heap property satisfied.'}`
        : `${currVal} ${currVal > parentVal ? '>' : '<='} parent ${parentVal}. ${condition ? 'Violation! Needs swim-up.' : 'Max-heap property satisfied.'}`,
      auxiliary: {
        heapArray: createHeapArrayItems(arr, [curr, parent]),
      },
    });

    if (condition) {
      // Swap elements
      arr[curr] = parentVal;
      arr[parent] = currVal;

      ({ nodes, rootId } = buildTreeFromHeapArray(arr, [], [curr, parent]));
      steps.push({
        stepIndex: stepCounter++,
        nodes,
        rootId,
        pointers: [
          { name: 'swapped', nodeId: `h${parent}`, color: '#10b981' },
        ],
        action: `Swapped [${curr}] and [${parent}]`,
        explanation: `Swapped value ${currVal} up to parent position [${parent}].`,
        auxiliary: {
          heapArray: createHeapArrayItems(arr, [], [curr, parent]),
        },
      });

      curr = parent;
    } else {
      break;
    }
  }

  ({ nodes, rootId } = buildTreeFromHeapArray(arr));
  steps.push({
    stepIndex: stepCounter++,
    nodes,
    rootId,
    pointers: [{ name: 'heap', nodeId: rootId, color: '#10b981' }],
    action: `${isMinHeap ? 'Min-Heap' : 'Max-Heap'} Insert Complete!`,
    explanation: `Value ${valToInsert} settled into its correct heap position. Heap invariant holds across all nodes.`,
    auxiliary: {
      heapArray: createHeapArrayItems(arr),
    },
  });

  return steps;
}

/**
 * Generate step-by-step Extract Root (ExtractMin / ExtractMax) with Sink (Trickle-down)
 */
export function generateHeapExtractSteps(
  initialArr: number[],
  isMinHeap: boolean = true
): TreeStepSnapshot[] {
  const steps: TreeStepSnapshot[] = [];
  if (initialArr.length === 0) return steps;

  const arr = [...initialArr];
  let stepCounter = 0;
  const rootVal = arr[0];

  let { nodes, rootId } = buildTreeFromHeapArray(arr, [0]);
  steps.push({
    stepIndex: stepCounter++,
    nodes,
    rootId,
    pointers: [{ name: 'extract', nodeId: 'h0', color: '#f43f5e' }],
    action: `Extract Root: ${rootVal}`,
    explanation: `Extracting ${isMinHeap ? 'minimum' : 'maximum'} element (${rootVal}) at root [0]. Will replace with last element in heap.`,
    auxiliary: {
      heapArray: createHeapArrayItems(arr, [0]),
    },
  });

  if (arr.length === 1) {
    arr.pop();
    steps.push({
      stepIndex: stepCounter++,
      nodes: {},
      rootId: null,
      pointers: [],
      action: 'Heap is now empty',
      explanation: 'Extracted the single remaining element from the heap.',
      auxiliary: { heapArray: [] },
    });
    return steps;
  }

  // Swap root with last element
  const lastVal = arr.pop()!;
  arr[0] = lastVal;

  ({ nodes, rootId } = buildTreeFromHeapArray(arr, [0]));
  steps.push({
    stepIndex: stepCounter++,
    nodes,
    rootId,
    pointers: [{ name: 'promoted', nodeId: 'h0', color: '#f59e0b' }],
    action: `Moved last element ${lastVal} to root [0]`,
    explanation: `Placed last element ${lastVal} at root. Array size reduced to ${arr.length}. Beginning trickle-down (sink).`,
    auxiliary: {
      heapArray: createHeapArrayItems(arr, [0]),
    },
  });

  // Sink / Trickle down
  let curr = 0;
  while (true) {
    const left = 2 * curr + 1;
    const right = 2 * curr + 2;
    let target = curr;

    if (left < arr.length) {
      if (isMinHeap ? arr[left] < arr[target] : arr[left] > arr[target]) {
        target = left;
      }
    }
    if (right < arr.length) {
      if (isMinHeap ? arr[right] < arr[target] : arr[right] > arr[target]) {
        target = right;
      }
    }

    if (target === curr) {
      break; // Heap property satisfied
    }

    const compareIndices = [curr, left];
    if (right < arr.length) compareIndices.push(right);

    ({ nodes, rootId } = buildTreeFromHeapArray(arr, compareIndices));
    steps.push({
      stepIndex: stepCounter++,
      nodes,
      rootId,
      pointers: [
        { name: 'curr', nodeId: `h${curr}`, color: '#38bdf8' },
        { name: 'swap_with', nodeId: `h${target}`, color: '#10b981' },
      ],
      action: `Sink: Compare node ${arr[curr]} with children`,
      explanation: `Child at [${target}] (value: ${arr[target]}) violates heap order with parent [${curr}] (value: ${arr[curr]}). Swapping.`,
      auxiliary: {
        heapArray: createHeapArrayItems(arr, compareIndices),
      },
    });

    // Swap curr and target
    const tmp = arr[curr];
    arr[curr] = arr[target];
    arr[target] = tmp;

    ({ nodes, rootId } = buildTreeFromHeapArray(arr, [], [curr, target]));
    steps.push({
      stepIndex: stepCounter++,
      nodes,
      rootId,
      pointers: [{ name: 'swapped', nodeId: `h${target}`, color: '#10b981' }],
      action: `Swapped [${curr}] with [${target}]`,
      explanation: `Pushed down to level ${Math.floor(Math.log2(target + 1))}.`,
      auxiliary: {
        heapArray: createHeapArrayItems(arr, [], [curr, target]),
      },
    });

    curr = target;
  }

  ({ nodes, rootId } = buildTreeFromHeapArray(arr));
  steps.push({
    stepIndex: stepCounter++,
    nodes,
    rootId,
    pointers: [{ name: 'root', nodeId: rootId, color: '#10b981' }],
    action: `Extraction & Trickle-Down Complete!`,
    explanation: `Extracted ${rootVal}. The new root is ${arr[0]}, and the complete heap property is restored.`,
    auxiliary: {
      heapArray: createHeapArrayItems(arr),
    },
  });

  return steps;
}
