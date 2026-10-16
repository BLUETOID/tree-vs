/**
 * C++ Step-by-Step AST Evaluator & Memory Simulator
 */

import type {
  ProgramNode,
  BaseASTNode,
  FunctionDeclNode,
  VariableDeclNode,
  AssignmentNode,
  MemberAssignmentNode,
  IfStatementNode,
  WhileStatementNode,
  ReturnStatementNode,
  BlockStatementNode,
  ExpressionStatementNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  CallExpressionNode,
  MemberCallExpressionNode,
  MemberAccessNode,
  ConditionalExpressionNode,
  NewExpressionNode,
  IdentifierNode,
  LiteralNode,
} from './ast';
import type { TraceEvent, InterpreterResult } from '../../types/interpreter';
import type { TreeNodeData, TreeStepSnapshot, PointerMarker } from '../../types/tree';

interface QueueObject {
  __type: 'queue';
  items: any[];
}

interface Frame {
  name: string;
  args: Record<string, any>;
  locals: Record<string, any>;
  line: number;
}

export class Evaluator {
  private functions: Map<string, FunctionDeclNode> = new Map();
  private heap: Map<string, TreeNodeData> = new Map();
  private heapCounter: number = 0;
  private callStack: Frame[] = [];
  private trace: TraceEvent[] = [];
  private stdout: string = '';
  private maxSteps: number = 5000;
  private stepCount: number = 0;
  private ast: ProgramNode;
  private globals: Record<string, any> = {};

  constructor(ast: ProgramNode) {
    this.ast = ast;
    for (const stmt of ast.body) {
      if (stmt.type === 'FunctionDeclaration') {
        const fn = stmt as FunctionDeclNode;
        this.functions.set(fn.name, fn);
      }
    }
  }

  public run(): InterpreterResult {
    try {
      // Initialize global variable declarations before entering main()
      for (const stmt of this.ast.body) {
        if (stmt.type === 'VariableDeclaration') {
          const decl = stmt as VariableDeclNode;
          let val: any = undefined;
          if (decl.initializer) {
            val = this.evaluateExpression(decl.initializer);
          }
          this.globals[decl.name] = val;
        }
      }

      const mainFn = this.functions.get('main');
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
    const mainFrame = this.callStack[0];

    // 1. Authoritative Tree Root Determination:
    // The visualizer represents the persistent tree structure in heap memory.
    // The true root of the tree MUST be:
    // a) The `root` variable declared/held in `mainFrame` (mainFrame.locals['root'] or mainFrame.args['root'])
    // b) Fallback: Topological in-degree 0 node (a node in heap that has no other node pointing left or right to it)
    // NEVER allow a recursive function parameter (such as `inorder(TreeNode* root)`) to usurp the tree's rootId!
    
    // Count incoming pointer edges for each node in heap
    const incomingCount: Map<string, number> = new Map();
    for (const [id] of this.heap) {
      incomingCount.set(id, 0);
    }
    for (const [, node] of this.heap) {
      if (node.left && this.heap.has(node.left)) {
        incomingCount.set(node.left, (incomingCount.get(node.left) || 0) + 1);
      }
      if (node.right && this.heap.has(node.right)) {
        incomingCount.set(node.right, (incomingCount.get(node.right) || 0) + 1);
      }
    }

    const zeroIncomingNodes: string[] = [];
    for (const [id, count] of incomingCount) {
      if (count === 0) zeroIncomingNodes.push(id);
    }

    let rootId: string | null = null;
    if (mainFrame && typeof mainFrame.locals['root'] === 'string' && this.heap.has(mainFrame.locals['root'])) {
      rootId = mainFrame.locals['root'];
    } else if (mainFrame && typeof mainFrame.args['root'] === 'string' && this.heap.has(mainFrame.args['root'])) {
      rootId = mainFrame.args['root'];
    } else if (zeroIncomingNodes.length > 0) {
      rootId = zeroIncomingNodes[0];
    } else if (this.heap.size > 0) {
      rootId = this.heap.keys().next().value || null;
    }

    // 2. Pointer Badges:
    const pointers: PointerMarker[] = [];
    let activeNodeId: string | null = null;
    let queueState: any[] = [];

    // Always include the tree's primary root pointer if available
    if (rootId && this.heap.has(rootId)) {
      pointers.push({ name: 'root', nodeId: rootId, color: '#06b6d4' });
    }

    if (currentFrame) {
      const allVars = { ...currentFrame.args, ...currentFrame.locals };
      for (const [varName, val] of Object.entries(allVars)) {
        if (typeof val === 'string' && this.heap.has(val)) {
          let color = '#38bdf8';
          let displayName = varName;

          if (varName === 'root') {
            if (currentFrame.name !== 'main') {
              // Inner recursive parameter! Display with function scope so it's clear
              displayName = `${currentFrame.name}.root`;
              color = '#f59e0b'; // Amber to distinguish from top-level root
              activeNodeId = val;
            } else {
              // Already added above
              continue;
            }
          } else if (varName === 'curr') {
            color = '#38bdf8';
            activeNodeId = val;
          } else if (varName === 'parent') {
            color = '#a855f7';
          } else if (varName === 'p' || varName === 'q') {
            color = '#eab308';
          } else if (varName === 'temp') {
            color = '#ec4899';
          } else if (varName === 'res') {
            color = '#10b981';
          }

          pointers.push({ name: displayName, nodeId: val, color });
          if (!activeNodeId) activeNodeId = val;
        } else if (val && typeof val === 'object' && val.__type === 'queue') {
          queueState = val.items.map((item: any) =>
            typeof item === 'string' && this.heap.has(item) ? this.heap.get(item)!.val : item
          );
        }
      }
    }

    // Deep copy heap for snapshot and derive clean parent pointers without cycles
    const heapSnapshot: Record<string, TreeNodeData> = {};
    for (const [id, node] of this.heap) {
      heapSnapshot[id] = {
        ...node,
        parent: null,
      };
      if (id === activeNodeId) {
        heapSnapshot[id].state = explanation.startsWith('cout') ? 'found' : 'active';
      }
    }

    // Traverse authoritative tree starting from rootId to assign tree parents
    if (rootId && heapSnapshot[rootId]) {
      const visited = new Set<string>();
      const queue = [rootId];
      visited.add(rootId);

      while (queue.length > 0) {
        const u = queue.shift()!;
        const curr = heapSnapshot[u];
        if (!curr) continue;

        if (curr.left && heapSnapshot[curr.left] && !visited.has(curr.left)) {
          heapSnapshot[curr.left].parent = u;
          visited.add(curr.left);
          queue.push(curr.left);
        }
        if (curr.right && heapSnapshot[curr.right] && !visited.has(curr.right)) {
          heapSnapshot[curr.right].parent = u;
          visited.add(curr.right);
          queue.push(curr.right);
        }
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
            if (typeof v === 'string' && this.heap.has(v)) {
              formattedArgs[k] = this.heap.get(v)!.val;
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
        queue: queueState.length > 0 ? queueState : undefined,
        breadcrumbs: this.callStack.map((f) => {
          const argsStr = Object.entries(f.args)
            .map(([k, v]) => `${k}=${typeof v === 'string' && this.heap.has(v) ? this.heap.get(v)!.val : v}`)
            .join(', ');
          return `${f.name}(${argsStr})`;
        }),
        recursionDepth: this.callStack.length,
      },
    };

    this.trace.push({
      step: this.trace.length,
      line,
      callStack: this.callStack.map((f) => {
        const formattedArgs: Record<string, any> = {};
        for (const [k, v] of Object.entries(f.args)) {
          if (typeof v === 'string' && this.heap.has(v)) {
            formattedArgs[k] = this.heap.get(v)!.val;
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
    const fn = this.functions.get(name);
    if (!fn) {
      throw new Error(`Function '${name}' is not defined.`);
    }

    const args: Record<string, any> = Object.create(null);
    fn.params.forEach((param, idx) => {
      args[param.name] = argValues[idx];
    });

    const frame: Frame = {
      name,
      args,
      locals: Object.create(null),
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

    this.recordStep(
      fn.line,
      `Returned from ${name}() ${returnValue !== undefined ? `with value ${returnValue}` : ''}`
    );
    this.callStack.pop();

    return returnValue;
  }

  private executeStatement(stmt: BaseASTNode): any {
    const frame = this.callStack[this.callStack.length - 1];

    switch (stmt.type) {
      case 'EmptyStatement':
        return;

      case 'VariableDeclaration': {
        const decl = stmt as VariableDeclNode;
        let val: any = undefined;
        if (decl.varType.startsWith('queue')) {
          val = { __type: 'queue', items: [] } as QueueObject;
        } else if (decl.initializer) {
          val = this.evaluateExpression(decl.initializer);
        }
        frame.locals[decl.name] = val;
        this.recordStep(
          stmt.line,
          `Declared variable ${decl.name}${val !== undefined ? ` = ${typeof val === 'object' && val?.__type === 'queue' ? 'queue<>' : val}` : ''}`
        );
        return;
      }

      case 'AssignmentStatement': {
        const assign = stmt as AssignmentNode;
        const val = this.evaluateExpression(assign.value);
        if (Object.prototype.hasOwnProperty.call(frame.locals, assign.target)) {
          frame.locals[assign.target] = val;
        } else if (Object.prototype.hasOwnProperty.call(frame.args, assign.target)) {
          frame.args[assign.target] = val;
        } else if (Object.prototype.hasOwnProperty.call(this.globals, assign.target)) {
          this.globals[assign.target] = val;
        } else {
          frame.locals[assign.target] = val;
        }
        this.recordStep(stmt.line, `Updated ${assign.target} = ${val}`);
        return;
      }

      case 'MemberAssignmentStatement': {
        const memAssign = stmt as MemberAssignmentNode;
        const objVal = this.evaluateExpression(memAssign.object);
        const val = this.evaluateExpression(memAssign.value);

        if (objVal === null || objVal === undefined) {
          throw new Error(`Null pointer dereference at line ${stmt.line} (cannot assign to '->${memAssign.property}')`);
        }

        const prop = memAssign.property;
        // P0 Security: Disallow prototype pollution keys
        if (prop === '__proto__' || prop === 'constructor' || prop === 'prototype') {
          throw new Error(`Security violation: attempted mutation of restricted property '${prop}' at line ${stmt.line}`);
        }

        if (typeof objVal === 'string' && this.heap.has(objVal)) {
          const node = this.heap.get(objVal)!;
          if (prop === 'val') {
            node.val = val;
          } else if (prop === 'left') {
            node.left = val;
          } else if (prop === 'right') {
            node.right = val;
          } else {
            throw new Error(`Invalid member '${prop}' on TreeNode at line ${stmt.line}`);
          }

          this.recordStep(
            stmt.line,
            `Assigned node ${node.val}->${prop} = ${typeof val === 'string' && this.heap.has(val) ? `Node(${this.heap.get(val)!.val})` : val}`
          );
        } else {
          throw new Error(`Invalid member assignment on non-heap object at line ${stmt.line}`);
        }
        return;
      }

      case 'IfStatement': {
        const ifStmt = stmt as IfStatementNode;
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
        const whileStmt = stmt as WhileStatementNode;
        while (this.evaluateExpression(whileStmt.condition)) {
          this.recordStep(stmt.line, `Loop condition true, executing iteration`);
          const res = this.executeStatement(whileStmt.body);
          if (res && res.__return__) return res;
        }
        return;
      }

      case 'ReturnStatement': {
        const retStmt = stmt as ReturnStatementNode;
        let value: any = undefined;
        if (retStmt.argument) {
          value = this.evaluateExpression(retStmt.argument);
        }
        this.recordStep(stmt.line, `Return statement: ${value}`);
        return { __return__: true, value };
      }

      case 'BlockStatement': {
        const block = stmt as BlockStatementNode;
        for (const s of block.body) {
          const res = this.executeStatement(s);
          if (res && res.__return__) return res;
        }
        return;
      }

      case 'ExpressionStatement': {
        const exprStmt = stmt as ExpressionStatementNode;
        this.evaluateExpression(exprStmt.expression);
        return;
      }
    }
  }

  private evaluateExpression(expr: BaseASTNode): any {
    const frame = this.callStack[this.callStack.length - 1];

    switch (expr.type) {
      case 'Literal':
        return (expr as LiteralNode).value;

      case 'Identifier': {
        const id = (expr as IdentifierNode).name;
        if (id === 'nullptr' || id === 'NULL') return null;
        if (id === 'true') return true;
        if (id === 'false') return false;
        if (id === 'endl') return 'endl';
        if (id === 'cout') return 'cout';
        if (id === 'INT_MIN' || id === 'LONG_MIN') return -2147483648;
        if (id === 'INT_MAX' || id === 'LONG_MAX') return 2147483647;

        // P0: Safe check against frame.locals and frame.args without prototype pollution
        if (frame) {
          if (Object.prototype.hasOwnProperty.call(frame.locals, id)) {
            return frame.locals[id];
          }
          if (Object.prototype.hasOwnProperty.call(frame.args, id)) {
            return frame.args[id];
          }
        }

        // Global variables
        if (Object.prototype.hasOwnProperty.call(this.globals, id)) {
          return this.globals[id];
        }

        // Global / Builtin functions
        if (this.functions.has(id)) return id;

        throw new Error(`Runtime error: Undefined identifier '${id}' at line ${expr.line}`);
      }

      case 'UnaryExpression': {
        const unary = expr as UnaryExpressionNode;
        const argVal = this.evaluateExpression(unary.argument);
        switch (unary.operator) {
          case '!':
            return !argVal;
          case '-':
            return -argVal;
          case '+':
            return +argVal;
          case '~':
            return ~argVal;
          default:
            throw new Error(`Unsupported unary operator '${unary.operator}' at line ${expr.line}`);
        }
      }

      case 'BinaryExpression': {
        const bin = expr as BinaryExpressionNode;

        // cout << value
        if (bin.operator === '<<') {
          const leftVal = this.evaluateExpression(bin.left);
          if (leftVal === 'cout') {
            const rightVal = this.evaluateExpression(bin.right);
            if (rightVal === 'endl') {
              this.stdout += '\n';
              this.recordStep(expr.line, `cout << endl`);
            } else {
              this.stdout += String(rightVal);
              this.recordStep(expr.line, `cout << ${rightVal}`);
            }
            return 'cout';
          }
        }

        // I-03: Logical short-circuiting
        if (bin.operator === '&&') {
          const leftVal = this.evaluateExpression(bin.left);
          if (!leftVal) return false;
          const rightVal = this.evaluateExpression(bin.right);
          return Boolean(rightVal);
        }

        if (bin.operator === '||') {
          const leftVal = this.evaluateExpression(bin.left);
          if (leftVal) return true;
          const rightVal = this.evaluateExpression(bin.right);
          return Boolean(rightVal);
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
            if (rightVal === 0) {
              throw new Error(`Runtime error: Division by zero at line ${expr.line}`);
            }
            return Math.trunc(leftVal / rightVal);
          case '%':
            if (rightVal === 0) {
              throw new Error(`Runtime error: Modulo by zero at line ${expr.line}`);
            }
            return leftVal % rightVal;
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
        }
        throw new Error(`Unsupported binary operator '${bin.operator}' at line ${expr.line}`);
      }

      case 'MemberAccessExpression': {
        const mem = expr as MemberAccessNode;
        const obj = this.evaluateExpression(mem.object);
        if (obj === null || obj === undefined) {
          throw new Error(
            `Runtime error: Null pointer dereference at line ${expr.line} (attempted to access '->${mem.property}' on null)`
          );
        }

        // P0: Disallow prototype keys
        if (mem.property === '__proto__' || mem.property === 'constructor' || mem.property === 'prototype') {
          throw new Error(
            `Security violation: attempted access of restricted property '${mem.property}' at line ${expr.line}`
          );
        }

        if (typeof obj === 'string' && this.heap.has(obj)) {
          const node = this.heap.get(obj)!;
          if (mem.property === 'val') return node.val;
          if (mem.property === 'left') return node.left;
          if (mem.property === 'right') return node.right;
          throw new Error(`Runtime error: TreeNode has no member '${mem.property}' at line ${expr.line}`);
        }
        throw new Error(`Runtime error: Cannot access member '${mem.property}' on non-heap object at line ${expr.line}`);
      }

      case 'MemberCallExpression': {
        const memCall = expr as MemberCallExpressionNode;
        const obj = this.evaluateExpression(memCall.object);
        const args = memCall.args.map((a) => this.evaluateExpression(a));

        if (obj && typeof obj === 'object' && obj.__type === 'queue') {
          const q = obj as QueueObject;
          if (memCall.method === 'push') {
            q.items.push(args[0]);
            const valDisplay =
              typeof args[0] === 'string' && this.heap.has(args[0]) ? this.heap.get(args[0])!.val : args[0];
            this.recordStep(expr.line, `q.push(${valDisplay})`);
            return;
          }
          if (memCall.method === 'pop') {
            const popped = q.items.shift();
            const valDisplay =
              typeof popped === 'string' && this.heap.has(popped) ? this.heap.get(popped)!.val : popped;
            this.recordStep(expr.line, `q.pop() -> removed ${valDisplay}`);
            return;
          }
          if (memCall.method === 'front') {
            if (q.items.length === 0) {
              throw new Error(`Runtime error: q.front() called on empty queue at line ${expr.line}`);
            }
            return q.items[0];
          }
          if (memCall.method === 'empty') {
            return q.items.length === 0;
          }
          if (memCall.method === 'size') {
            return q.items.length;
          }
        }
        throw new Error(`Runtime error: Method '${memCall.method}' not supported on object at line ${expr.line}`);
      }

      case 'NewExpression': {
        const newExpr = expr as NewExpressionNode;
        const valArg = newExpr.args[0] ? this.evaluateExpression(newExpr.args[0]) : 0;
        const id = `n${this.heapCounter++}`;
        this.heap.set(id, {
          id,
          val: valArg,
          left: null,
          right: null,
          parent: null,
          state: 'default',
        });
        this.recordStep(expr.line, `new TreeNode(${valArg}) allocated at &${id}`);
        return id;
      }

      case 'CallExpression': {
        const call = expr as CallExpressionNode;
        const argValues = call.args.map((a: BaseASTNode) => this.evaluateExpression(a));

        if (call.callee === 'max') {
          return Math.max(argValues[0], argValues[1]);
        }
        if (call.callee === 'min') {
          return Math.min(argValues[0], argValues[1]);
        }

        return this.callFunction(call.callee, argValues);
      }

      case 'ConditionalExpression': {
        const condExpr = expr as ConditionalExpressionNode;
        const condVal = this.evaluateExpression(condExpr.condition);
        return condVal
          ? this.evaluateExpression(condExpr.consequent)
          : this.evaluateExpression(condExpr.alternate);
      }
    }
  }
}
