import { describe, it, expect } from 'vitest';
import { runCppTreeInterpreter } from '../src/core/interpreter';
import { PRESET_PROGRAMS } from '../src/presets/catalog';

describe('Bundled Preset Integration & Invariant Tests', () => {
  it('1. bst-insert: inserts 7 nodes and keeps correct tree structure', () => {
    const preset = PRESET_PROGRAMS.find((p) => p.id === 'bst-insert')!;
    const result = runCppTreeInterpreter(preset.code);
    expect(result.error).toBeUndefined();
    expect(result.trace.length).toBeGreaterThan(10);

    const finalSnapshot = result.trace[result.trace.length - 1].treeSnapshot;
    expect(finalSnapshot.rootId).toBe('n0');
    expect(Object.keys(finalSnapshot.nodes).length).toBe(7);
  });

  it('2. bst-search: searches and finds target node 20', () => {
    const preset = PRESET_PROGRAMS.find((p) => p.id === 'bst-search')!;
    const result = runCppTreeInterpreter(preset.code);
    expect(result.error).toBeUndefined();

    // Check pointer markers at end
    const lastEvent = result.trace[result.trace.length - 1];
    const resMarker = lastEvent.treeSnapshot.pointers.find((p) => p.name === 'res');
    expect(resMarker).toBeDefined();
    expect(resMarker?.nodeId).toBe('n4'); // Node with val 20
  });

  it('3. bst-delete: deletes node 30 and replaces with in-order successor', () => {
    const preset = PRESET_PROGRAMS.find((p) => p.id === 'bst-delete')!;
    const result = runCppTreeInterpreter(preset.code);
    expect(result.error).toBeUndefined();

    const finalSnapshot = result.trace[result.trace.length - 1].treeSnapshot;
    expect(finalSnapshot.rootId).toBe('n0');
  });

  it('4. tree-invert: mirrors left and right subtrees', () => {
    const preset = PRESET_PROGRAMS.find((p) => p.id === 'tree-invert')!;
    const result = runCppTreeInterpreter(preset.code);
    expect(result.error).toBeUndefined();

    const finalSnapshot = result.trace[result.trace.length - 1].treeSnapshot;
    const root = finalSnapshot.nodes[finalSnapshot.rootId!];
    expect(root.val).toBe(4);
    // Left was 2, right was 7; after inversion root->left is 7 and root->right is 2
    expect(finalSnapshot.nodes[root.left!].val).toBe(7);
    expect(finalSnapshot.nodes[root.right!].val).toBe(2);
  });

  it('5. max-depth: prints "Max Depth: 3" without undefined', () => {
    const preset = PRESET_PROGRAMS.find((p) => p.id === 'max-depth')!;
    const result = runCppTreeInterpreter(preset.code);
    expect(result.error).toBeUndefined();
    expect(result.stdout.trim()).toBe('Max Depth: 3');
  });

  it('6. avl-ll-rotation: performs right rotation, elevating node 20 to root', () => {
    const preset = PRESET_PROGRAMS.find((p) => p.id === 'avl-ll-rotation')!;
    const result = runCppTreeInterpreter(preset.code);
    expect(result.error).toBeUndefined();

    const finalSnapshot = result.trace[result.trace.length - 1].treeSnapshot;
    expect(finalSnapshot.rootId).toBe('n1'); // Node with val 20 is the new root!
    const root = finalSnapshot.nodes[finalSnapshot.rootId!];
    expect(root.val).toBe(20);
    expect(finalSnapshot.nodes[root.left!].val).toBe(10);
    expect(finalSnapshot.nodes[root.right!].val).toBe(30);
  });

  it('7. avl-lr-rotation: performs double rotation, elevating node 20 to root', () => {
    const preset = PRESET_PROGRAMS.find((p) => p.id === 'avl-lr-rotation')!;
    const result = runCppTreeInterpreter(preset.code);
    expect(result.error).toBeUndefined();

    const finalSnapshot = result.trace[result.trace.length - 1].treeSnapshot;
    expect(finalSnapshot.rootId).toBe('n2'); // Node with val 20 is the new root!
    const root = finalSnapshot.nodes[finalSnapshot.rootId!];
    expect(root.val).toBe(20);
    expect(finalSnapshot.nodes[root.left!].val).toBe(10);
    expect(finalSnapshot.nodes[root.right!].val).toBe(30);
  });

  it('8. inorder-traversal: prints exact ascending sequence "1 2 3 4 5 6 7 "', () => {
    const preset = PRESET_PROGRAMS.find((p) => p.id === 'inorder-traversal')!;
    const result = runCppTreeInterpreter(preset.code);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toBe('1 2 3 4 5 6 7 ');
  });

  it('9. level-order-bfs: executes level-order traversal with FIFO queue', () => {
    const preset = PRESET_PROGRAMS.find((p) => p.id === 'level-order-bfs')!;
    const result = runCppTreeInterpreter(preset.code);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toBe('1 2 3 4 5 6 ');
  });
});
