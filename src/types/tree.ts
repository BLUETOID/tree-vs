/**
 * Tree & Graph Visualizer - Core Tree Types & Interfaces
 */

export type TreeNodeState =
  | 'default'
  | 'active'
  | 'comparing'
  | 'found'
  | 'inserting'
  | 'rotating'
  | 'swapping'
  | 'deleted'
  | 'pruned'
  | 'highlighted';

export type TreeEdgeState =
  | 'default'
  | 'active'
  | 'traversed'
  | 'relinking'
  | 'pruned';

export interface TreeNodeData {
  id: string;
  val: number | string;
  left: string | null;
  right: string | null;
  parent: string | null;
  address?: string;
  height?: number;
  balanceFactor?: number;
  isWordEnd?: boolean; // For Trie
  rank?: number; // For DSU
  children?: string[]; // For General Trees & Adjacency Lists
  state?: TreeNodeState;
}

export interface TreeLayoutNode {
  id: string;
  val: number | string;
  x: number;
  y: number;
  radius: number;
  state: TreeNodeState;
  parent?: string | null;
  height?: number;
  depth?: number;
  balanceFactor?: number;
  isWordEnd?: boolean;
  rank?: number;
  label?: string;
}

export interface TreeLayoutEdge {
  id: string;
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  state: TreeEdgeState;
}

export interface PointerMarker {
  name: string;
  nodeId: string | null;
  color: string;
  offsetY?: number;
}

export interface CallStackFrame {
  id: string;
  functionName: string;
  args: Record<string, any>;
  locals?: Record<string, any>;
  retVal?: any;
  status: 'active' | 'returning' | 'completed';
}

export interface HeapArrayItem {
  index: number;
  val: number | string;
  nodeId?: string;
  state?: 'default' | 'active' | 'comparing' | 'swapping' | 'sorted';
}

export interface DsuSetGroup {
  rootId: string;
  members: string[];
  rank: number;
}

export interface StepAuxiliaryData {
  queue?: (number | string)[];
  callStack?: CallStackFrame[];
  heapArray?: HeapArrayItem[];
  dsuSets?: DsuSetGroup[];
  traversalOutput?: (number | string)[];
  rotationType?: 'LL' | 'RR' | 'LR' | 'RL';
  comparisonsCount?: number;
  breadcrumbs?: string[];
  recursionDepth?: number;
  phase?: 'call' | 'base-case' | 'compare' | 'mutate' | 'return' | 'output';
}

export interface TreeStepSnapshot {
  stepIndex: number;
  nodes: Record<string, TreeNodeData>;
  rootId: string | null;
  rootIds?: string[]; // Multiple roots for DSU forest
  pointers: PointerMarker[];
  action: string;
  explanation: string;
  codeLine?: number;
  auxiliary: StepAuxiliaryData;
}

export type TreeStructureType =
  | 'bst'
  | 'avl'
  | 'heap'
  | 'trie'
  | 'dsu'
  | 'general';
