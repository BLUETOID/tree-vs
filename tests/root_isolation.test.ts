import { describe, it, expect } from 'vitest';
import { runCppTreeInterpreter } from '../src/core/interpreter';
import { PRESET_PROGRAMS } from '../src/presets/catalog';
import { computeTreeLayout } from '../src/core/layout/tidyTree';

describe('Root Isolation & Binary Direction Layout', () => {
  it('inorder-traversal maintains true root n0 (node 4) across ALL trace events without recursive hijack', () => {
    const preset = PRESET_PROGRAMS.find((p) => p.id === 'inorder-traversal')!;
    const result = runCppTreeInterpreter(preset.code);
    expect(result.error).toBeUndefined();
    expect(result.trace.length).toBeGreaterThan(5);

    // Assert that once root node n0 is allocated, rootId is ALWAYS 'n0' (value 4) without being hijacked by recursive calls
    const allocatedEvents = result.trace.filter((e) => e.treeSnapshot?.nodes['n0']);
    expect(allocatedEvents.length).toBeGreaterThan(5);
    for (const event of allocatedEvents) {
      expect(event.treeSnapshot?.rootId).toBe('n0');
      expect(event.treeSnapshot?.nodes['n0']?.val).toBe(4);
    }
  });

  it('computes strict binary directional layout where left child is left of parent and right child is right of parent', () => {
    // Tree: 4 has left 2 (with right 3), right 6 (with left 5, right 7)
    const nodesMap = {
      n0: { id: 'n0', val: 4, left: 'n1', right: 'n2', parent: null },
      n1: { id: 'n1', val: 2, left: null, right: 'n3', parent: 'n0' },
      n2: { id: 'n2', val: 6, left: 'n4', right: 'n5', parent: 'n0' },
      n3: { id: 'n3', val: 3, left: null, right: null, parent: 'n1' },
      n4: { id: 'n4', val: 5, left: null, right: null, parent: 'n2' },
      n5: { id: 'n5', val: 7, left: null, right: null, parent: 'n2' },
    };

    const layout = computeTreeLayout(nodesMap, 'n0');
    const pos = new Map(layout.nodes.map((n) => [n.val, n]));

    const node4 = pos.get(4)!;
    const node2 = pos.get(2)!;
    const node6 = pos.get(6)!;
    const node3 = pos.get(3)!;
    const node5 = pos.get(5)!;
    const node7 = pos.get(7)!;

    // Left child 2 must be strictly to the left of 4
    expect(node2.x).toBeLessThan(node4.x);
    // Right child 6 must be strictly to the right of 4
    expect(node6.x).toBeGreaterThan(node4.x);

    // In node 6: left child 5 must be to left of 6, right child 7 to right of 6
    expect(node5.x).toBeLessThan(node6.x);
    expect(node7.x).toBeGreaterThan(node6.x);

    // In node 2: single right child 3 must be strictly to the right of 2 (binary branching!)
    expect(node3.x).toBeGreaterThan(node2.x);

    // Depth checks: parent y < child y
    expect(node4.y).toBeLessThan(node2.y);
    expect(node2.y).toBeLessThan(node3.y);
    expect(node6.y).toBeLessThan(node5.y);

    // Node 5 must be below node 6, NOT placed above or backwards!
    expect(node5.y).toBeGreaterThan(node6.y);
  });
});
