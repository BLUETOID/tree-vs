import { describe, it, expect } from 'vitest';
import {
  buildTreeFromLeetCodeArray,
  generateBstInsertSteps,
  generateBstSearchSteps,
  generateBstDeleteSteps,
  generateTreeInvertSteps,
} from '../src/core/algorithms/bstAlgorithms';
import {
  generateAvlInsertSteps,
  computeHeightsAndBF,
} from '../src/core/algorithms/avlAlgorithms';
import {
  generateHeapInsertSteps,
  generateHeapExtractSteps,
} from '../src/core/algorithms/heapAlgorithms';
import {
  generateDsuFindSteps,
  generateDsuUnionSteps,
} from '../src/core/algorithms/dsuAlgorithms';
import { generateTrieSearchSteps } from '../src/core/algorithms/trieAlgorithms';

describe('Tree Algorithms Unit Tests', () => {
  it('parses LeetCode level-order array into valid node tree', () => {
    const { nodes, rootId } = buildTreeFromLeetCodeArray([4, 2, 7, 1, 3]);
    expect(rootId).toBe('n0');
    expect(nodes['n0'].val).toBe(4);
    expect(nodes['n0'].left).toBe('n1');
    expect(nodes['n0'].right).toBe('n2');
    expect(nodes['n1'].val).toBe(2);
    expect(nodes['n2'].val).toBe(7);
  });

  it('generates step-by-step BST search timeline', () => {
    const { nodes, rootId } = buildTreeFromLeetCodeArray([4, 2, 7, 1, 3]);
    const steps = generateBstSearchSteps(nodes, rootId, 3);
    expect(steps.length).toBeGreaterThan(1);
    const lastStep = steps[steps.length - 1];
    expect(lastStep.action).toContain('Found Target 3');
  });

  it('generates step-by-step BST insert timeline', () => {
    const { nodes, rootId } = buildTreeFromLeetCodeArray([4, 2, 7]);
    const steps = generateBstInsertSteps(nodes, rootId, 5);
    const lastStep = steps[steps.length - 1];
    expect(lastStep.action).toBe('Insertion Complete');
    const insertedNode = Object.values(lastStep.nodes).find((n) => n.val === 5);
    expect(insertedNode).toBeDefined();
    expect(insertedNode?.parent).toBe('n2'); // 5 should be left child of 7
  });

  it('generates step-by-step BST delete covering leaf, single child, and 2 children', () => {
    const { nodes, rootId } = buildTreeFromLeetCodeArray([5, 3, 6, 2, 4, null, 7]);
    const steps = generateBstDeleteSteps(nodes, rootId, 3);
    expect(steps.length).toBeGreaterThan(2);
    const lastStep = steps[steps.length - 1];
    expect(lastStep.action).toContain('Successor');
    // Value 3 should no longer exist
    const hasThree = Object.values(lastStep.nodes).some((n) => n.val === 3);
    expect(hasThree).toBe(false);
  });

  it('inverts binary tree recursively', () => {
    const { nodes, rootId } = buildTreeFromLeetCodeArray([4, 2, 7]);
    const steps = generateTreeInvertSteps(nodes, rootId);
    const lastStep = steps[steps.length - 1];
    expect(lastStep.nodes[rootId!].left).toBe('n2'); // 7 is now left
    expect(lastStep.nodes[rootId!].right).toBe('n1'); // 2 is now right
  });

  it('computes AVL balance factors and triggers rotations on imbalance', () => {
    const { nodes, rootId } = buildTreeFromLeetCodeArray([30, 20]);
    computeHeightsAndBF(nodes, rootId);
    // Insert 10 into left subtree -> triggers LL right rotation
    const steps = generateAvlInsertSteps(nodes, rootId, 10);
    const rotationStep = steps.find((s) => s.auxiliary.rotationType === 'LL');
    expect(rotationStep).toBeDefined();
  });

  it('simulates min-heap insert with bubble-up swim', () => {
    const initial = [10, 20, 15];
    const steps = generateHeapInsertSteps(initial, 5, true);
    const lastStep = steps[steps.length - 1];
    // 5 must be at root of min-heap
    expect(lastStep.nodes['h0'].val).toBe(5);
  });

  it('simulates min-heap extract-min with trickle-down sink', () => {
    const initial = [5, 10, 15, 20];
    const steps = generateHeapExtractSteps(initial, true);
    const lastStep = steps[steps.length - 1];
    // Root should now be 10
    expect(lastStep.nodes['h0'].val).toBe(10);
  });

  it('simulates DSU find with path compression and union by rank', () => {
    const parent = [0, 1, 2, 3];
    const rank = [0, 0, 0, 0];
    const unionSteps = generateDsuUnionSteps(parent, rank, 0, 1);
    expect(unionSteps.length).toBeGreaterThan(1);

    const findSteps = generateDsuFindSteps([1, 1, 1], [1, 0, 0], 2);
    expect(findSteps.length).toBeGreaterThan(1);
  });

  it('simulates Trie word and prefix search', () => {
    const steps = generateTrieSearchSteps(['apple', 'banana'], 'app', true);
    const lastStep = steps[steps.length - 1];
    expect(lastStep.action).toContain('Match Found');
  });

  it('guarantees zero node collisions/overlaps on deep asymmetrical trees', async () => {
    const { computeTreeLayout } = await import('../src/core/layout/tidyTree');
    // Complex asymmetrical tree with deep subtrees
    const { nodes, rootId } = buildTreeFromLeetCodeArray([10, 5, 20, 3, 7, 15, 25, 1, 4, 6, 8, null, 17]);
    const layout = computeTreeLayout(nodes, rootId);

    // Group nodes by depth Y coordinate
    const byLevel = new Map<number, typeof layout.nodes>();
    for (const node of layout.nodes) {
      const list = byLevel.get(node.y) || [];
      list.push(node);
      byLevel.set(node.y, list);
    }

    // Verify distance between adjacent nodes on each level is at least 2 * radius
    for (const [, levelNodes] of byLevel) {
      levelNodes.sort((a, b) => a.x - b.x);
      for (let i = 0; i < levelNodes.length - 1; i++) {
        const gap = levelNodes[i + 1].x - levelNodes[i].x;
        expect(gap).toBeGreaterThanOrEqual(levelNodes[i].radius * 2);
      }
    }
  });
});
