/**
 * Tree & Graph Visualizer - Interpreter & AST Types
 */

import type { TreeStepSnapshot } from './tree';

export type TokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'OPERATOR'
  | 'PUNCTUATION'
  | 'COMMENT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

export interface ASTNode {
  type: string;
  line: number;
  [key: string]: any;
}

export interface TraceEvent {
  step: number;
  line: number;
  callStack: {
    name: string;
    args: Record<string, any>;
    locals: Record<string, any>;
    line: number;
  }[];
  treeSnapshot?: TreeStepSnapshot;
  stdout: string;
  explanation: string;
}

export interface InterpreterResult {
  trace: TraceEvent[];
  stdout: string;
  error?: string;
  errorLine?: number;
}
