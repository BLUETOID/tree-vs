/**
 * C++ Step-by-Step AST Evaluator & Memory Simulator
 */

import type { ProgramNode, BaseASTNode, FunctionDeclNode } from './ast';
import type { TraceEvent, InterpreterResult } from '../../types/interpreter';
import type { TreeNodeData, TreeStepSnapshot, PointerMarker } from '../../types/tree';

interface Frame {
  name: string;
  args: Record<string, any>;
  locals: Record<string, any>;
  line: number;
}

export class Evaluator {
  private functions: Record<string, FunctionDeclNode> = {};
  private heap: Record<string, TreeNodeData> = {};
  private heapCounter: number = 0;
  private callStack: Frame[] = [];
  private trace: TraceEvent[] = [];
  private stdout: string = '';
  private maxSteps: number = 1000;
  private stepCount: number = 0;

  constructor(ast: ProgramNode) {
    for (const stmt of ast.body) {
      if (stmt.type === 'FunctionDeclaration') {
        const fn = stmt as FunctionDeclNode;
        this.functions[fn.name] = fn;
      }
    }
  }

  public run(): InterpreterResult {
    try {
      const mainFn = this.functions['main'];
      if (!mainFn) {
        return {
          trace: [],
          stdout: '',
          error: 'No main() function found in C++ source code.',
        };
      }

      this.callFunction('main', []);

      return {
        trace: this.trace,
        stdout: this.stdout,
      };
    } catch (err: any) {
      return {
        trace: this.trace,
        stdout: this.stdout,
        error: err.message || 'Execution error',
      };
    }
  }

  private recordStep(line: number, explanation: string) {
    if (this.stepCount++ > this.maxSteps) {
      throw new Error('Maximum execution steps exceeded (infinite loop/recursion detected).');
    }

    const currentFrame = this.callStack[this.callStack.length - 1];

    // Find active pointer markers from current frame variables
    const pointers: PointerMarker[] = [];

    // Find TRUE tree root: the node with no parent, or first allocated
    let rootId: string | null = null;
    const trueRoots = Object.keys(this.heap).filter((id) => !this.heap[id].parent);
    if (trueRoots.length > 0) {
      rootId = trueRoots[0];
    } else if (Object.keys(this.heap).length > 0) {
      rootId = Object.keys(this.heap)[0];
    }

    let activeNodeId: string | null = null;
    if (currentFrame) {
      const allVars = { ...currentFrame.args, ...currentFrame.locals };
      for (const [varName, val] of Object.entries(allVars)) {
        if (typeof val === 'string' && this.heap[val]) {
          let color = '#06b6d4';
          if (varName === 'root') {
            color = '#06b6d4';
            activeNodeId = val;
          } else if (varName === 'curr') {
            color = '#38bdf8';
            activeNodeId = val;
          } else if (varName === 'parent') {
            color = '#a855f7';
          } else if (varName === 'p' || varName === 'q') {
            color = '#eab308';
          } else if (varName === 'temp') {
            color = '#ec4899';
          }

          pointers.push({ name: varName, nodeId: val, color });
        }
      }
    }

    // Deep copy heap for snapshot and apply active state
    const heapSnapshot: Record<string, TreeNodeData> = {};
    for (const [id, node] of Object.entries(this.heap)) {
      heapSnapshot[id] = { ...node };
      if (id === activeNodeId) {
        heapSnapshot[id].state = explanation.startsWith('cout') ? 'found' : 'active';
      }
    }

    const treeSnapshot: TreeStepSnapshot = {
      stepIndex: this.trace.length,
      nodes: heapSnapshot,
      rootId,
      pointers,
      action: explanation.slice(0, 40),
      explanation,
      codeLine: line,
      auxiliary: {
        callStack: this.callStack.map((f, idx) => {
          const formattedArgs: Record<string, any> = {};
          for (const [k, v] of Object.entries(f.args)) {
            if (typeof v === 'string' && this.heap[v]) {
              formattedArgs[k] = this.heap[v].val;
            } else {
              formattedArgs[k] = v;
            }
          }
          return {
            id: `frame_${idx}`,
            functionName: `${f.name}()`,
            args: formattedArgs,
            status: 'active',
          };
        }),
      },
    };

    this.trace.push({
      step: this.trace.length,
      line,
      callStack: this.callStack.map((f) => {
        const formattedArgs: Record<string, any> = {};
        for (const [k, v] of Object.entries(f.args)) {
          if (typeof v === 'string' && this.heap[v]) {
            formattedArgs[k] = this.heap[v].val;
          } else {
            formattedArgs[k] = v;
          }
        }
        return {
          name: f.name,
          args: formattedArgs,
          locals: { ...f.locals },
          line: f.line,
        };
      }),
      treeSnapshot,
      stdout: this.stdout,
      explanation,
    });
  }

  private callFunction(name: string, argValues: any[]): any {
    const fn = this.functions[name];
    if (!fn) {
      throw new Error(`Function '${name}' is not defined.`);
    }

    const args: Record<string, any> = {};
    fn.params.forEach((param, idx) => {
      args[param.name] = argValues[idx];
    });

    const frame: Frame = {
      name,
      args,
      locals: {},
      line: fn.line,
    };

    this.callStack.push(frame);
    this.recordStep(fn.line, `Invoked function ${name}(${argValues.join(', ')})`);

    let returnValue: any = undefined;

    for (const stmt of fn.body.body) {
      const res = this.executeStatement(stmt);
      if (res && res.__return__) {
        returnValue = res.value;
        break;
      }
    }

    this.callStack.pop();
    this.recordStep(
      fn.line,
      `Returned from ${name}() ${returnValue !== undefined ? `with value ${returnValue}` : ''}`
    );

    return returnValue;
  }

  private executeStatement(stmt: BaseASTNode): any {
    const frame = this.callStack[this.callStack.length - 1];

    switch (stmt.type) {
      case 'VariableDeclaration': {
        const decl = stmt as any;
        let val: any = undefined;
        if (decl.initializer) {
          val = this.evaluateExpression(decl.initializer);
        }
        frame.locals[decl.name] = val;
        this.recordStep(stmt.line, `Declared variable ${decl.name} = ${val}`);
        return;
      }

      case 'AssignmentStatement': {
        const assign = stmt as any;
        const val = this.evaluateExpression(assign.value);
        if (frame.locals[assign.target] !== undefined) {
          frame.locals[assign.target] = val;
        } else if (frame.args[assign.target] !== undefined) {
          frame.args[assign.target] = val;
        } else {
          frame.locals[assign.target] = val;
        }
        this.recordStep(stmt.line, `Updated ${assign.target} = ${val}`);
        return;
      }

      case 'MemberAssignmentStatement': {
        const memAssign = stmt as any;
        const objVal = this.evaluateExpression(memAssign.object);
        const val = this.evaluateExpression(memAssign.value);

        if (typeof objVal === 'string' && this.heap[objVal]) {
          const prop = memAssign.property;
          (this.heap[objVal] as any)[prop] = val;

          // If updating left or right, set child parent pointer
          if ((prop === 'left' || prop === 'right') && typeof val === 'string' && this.heap[val]) {
            this.heap[val].parent = objVal;
          }

          this.recordStep(
            stmt.line,
            `Assigned node ${this.heap[objVal]?.val}->${prop} = ${typeof val === 'string' && this.heap[val] ? `Node(${this.heap[val].val})` : val}`
          );
        }
        return;
      }

      case 'IfStatement': {
        const ifStmt = stmt as any;
        const cond = this.evaluateExpression(ifStmt.condition);
        this.recordStep(stmt.line, `Evaluated condition (${cond})`);

        if (cond) {
          return this.executeStatement(ifStmt.consequent);
        } else if (ifStmt.alternate) {
          return this.executeStatement(ifStmt.alternate);
        }
        return;
      }

      case 'WhileStatement': {
        const whileStmt = stmt as any;
        while (this.evaluateExpression(whileStmt.condition)) {
          this.recordStep(stmt.line, `Loop iteration start`);
          const res = this.executeStatement(whileStmt.body);
          if (res && res.__return__) return res;
        }
        return;
      }

      case 'ReturnStatement': {
        const retStmt = stmt as any;
        let value: any = undefined;
        if (retStmt.argument) {
          value = this.evaluateExpression(retStmt.argument);
        }
        this.recordStep(stmt.line, `Return statement encountered: ${value}`);
        return { __return__: true, value };
      }

      case 'BlockStatement': {
        const block = stmt as any;
        for (const s of block.body) {
          const res = this.executeStatement(s);
          if (res && res.__return__) return res;
        }
        return;
      }

      case 'ExpressionStatement': {
        const exprStmt = stmt as any;
        this.evaluateExpression(exprStmt.expression);
        return;
      }
    }
  }

  private evaluateExpression(expr: BaseASTNode): any {
    const frame = this.callStack[this.callStack.length - 1];

    switch (expr.type) {
      case 'Literal':
        return (expr as any).value;

      case 'Identifier': {
        const id = (expr as any).name;
        if (id === 'nullptr' || id === 'NULL') return null;
        if (id === 'true') return true;
        if (id === 'false') return false;

        if (frame.locals[id] !== undefined) return frame.locals[id];
        if (frame.args[id] !== undefined) return frame.args[id];
        return undefined;
      }

      case 'BinaryExpression': {
        const bin = expr as any;

        // cout << value
        if (bin.operator === '<<') {
          const isLeftDirectCout = bin.left.type === 'Identifier' && bin.left.name === 'cout';
          const leftVal = isLeftDirectCout ? 'cout' : this.evaluateExpression(bin.left);
          if (leftVal === 'cout') {
            const val = this.evaluateExpression(bin.right);
            this.stdout += String(val === 'endl' ? '\n' : val);
            this.recordStep(expr.line, `cout << ${val}`);
            return 'cout';
          }
        }

        const leftVal = this.evaluateExpression(bin.left);
        const rightVal = this.evaluateExpression(bin.right);

        switch (bin.operator) {
          case '+':
            return leftVal + rightVal;
          case '-':
            return leftVal - rightVal;
          case '*':
            return leftVal * rightVal;
          case '/':
            return Math.floor(leftVal / rightVal);
          case '==':
            return leftVal === rightVal;
          case '!=':
            return leftVal !== rightVal;
          case '<':
            return leftVal < rightVal;
          case '>':
            return leftVal > rightVal;
          case '<=':
            return leftVal <= rightVal;
          case '>=':
            return leftVal >= rightVal;
          case '&&':
            return Boolean(leftVal && rightVal);
          case '||':
            return Boolean(leftVal || rightVal);
        }
        return undefined;
      }

      case 'MemberAccessExpression': {
        const mem = expr as any;
        const obj = this.evaluateExpression(mem.object);
        if (typeof obj === 'string' && this.heap[obj]) {
          return (this.heap[obj] as any)[mem.property];
        }
        return undefined;
      }

      case 'NewExpression': {
        const newExpr = expr as any;
        const valArg = newExpr.args[0] ? this.evaluateExpression(newExpr.args[0]) : 0;
        const id = `n${this.heapCounter++}`;
        this.heap[id] = {
          id,
          val: valArg,
          left: null,
          right: null,
          parent: null,
          state: 'default',
        };
        this.recordStep(expr.line, `new TreeNode(${valArg}) allocated at &${id}`);
        return id;
      }

      case 'CallExpression': {
        const call = expr as any;
        const argValues = call.args.map((a: BaseASTNode) => this.evaluateExpression(a));

        if (call.callee === 'max') {
          return Math.max(argValues[0], argValues[1]);
        }
        if (call.callee === 'min') {
          return Math.min(argValues[0], argValues[1]);
        }

        return this.callFunction(call.callee, argValues);
      }
    }
  }
}
