/**
 * Tree & Graph Visualizer - Presets & Catalog Types
 */

import type { TreeStructureType } from './tree';

export type PresetCategory =
  | 'Binary Search Tree (BST)'
  | 'AVL Tree (Self-Balancing)'
  | 'Binary Heaps (Min/Max)'
  | 'Trie (Prefix Tree)'
  | 'Disjoint Set Union (DSU)'
  | 'Tree Traversals & Views'
  | 'Classic LeetCode Tree Problems';

export interface PresetExample {
  id: string;
  name: string;
  category: PresetCategory;
  structureType: TreeStructureType;
  description: string;
  explanation: string;
  initialTreeValues?: (number | string | null)[];
  defaultArgs?: Record<string, any>;
  code: string;
  defaultInput?: string;
}
