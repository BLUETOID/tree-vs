/**
 * C++ Interpreter Entry Point for Tree & Graph Visualizer
 */

import { tokenize } from './lexer';
import { Parser } from './parser';
import { Evaluator } from './evaluator';
import type { InterpreterResult } from '../../types/interpreter';

export function runCppTreeInterpreter(sourceCode: string): InterpreterResult {
  try {
    const tokens = tokenize(sourceCode);
    const parser = new Parser(tokens);
    const ast = parser.parseProgram();
    const evaluator = new Evaluator(ast);
    return evaluator.run();
  } catch (err: any) {
    return {
      trace: [],
      stdout: '',
      error: err.message || 'Syntax / Execution error',
    };
  }
}
