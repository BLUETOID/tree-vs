/**
 * C++ Step-by-Step AST Evaluator & Memory Simulator
 */

import type {
  ProgramNode,
  BaseASTNode,
  FunctionDeclNode,
  VariableDeclNode,
  AssignmentNode,
  CompoundAssignmentNode,
  MemberAssignmentNode,
  IndexAssignmentNode,
  IfStatementNode,
  WhileStatementNode,
  ForStatementNode,
  RangeForStatementNode,
  ReturnStatementNode,
  BlockStatementNode,
  ExpressionStatementNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  UpdateExpressionNode,
  CallExpressionNode,
  MemberCallExpressionNode,
  MemberAccessNode,
  IndexAccessNode,
  ConditionalExpressionNode,
  NewExpressionNode,
  IdentifierNode,
  LiteralNode,
  ArrayLiteralNode,
  StructDeclNode,
  VariableDeclarator,
} from './ast';
import type { TraceEvent, InterpreterResult } from '../../types/interpreter';
import type { TreeNodeData, TreeStepSnapshot, PointerMarker } from '../../types/tree';

interface QueueObject {
  __type: 'queue';
  items: any[];
}

interface StackObject {
  __type: 'stack';
  items: any[];
}

interface VectorArrayObject {
  __type: 'vector_array';
  map: Map<any, any[]>;
}

function createVector(initialItems: any[] = []): any[] {
  const arr: any[] = [...initialItems];
  (arr as any).__type = 'vector';
  (arr as any).push_back = function (v: any) {
    this.push(v);
  };
  (arr as any).pop_back = function () {
    return this.pop();
  };
  (arr as any).size = function () {
    return this.length;
  };
  (arr as any).empty = function () {
    return this.length === 0;
  };
  (arr as any).clear = function () {
    this.length = 0;
  };
  return arr;
}



interface Frame {
  name: string;
  args: Record<string, any>;
  locals: Record<string, any>;
  refs?: Record<string, { get: () => any; set: (val: any) => void }>;
  line: number;
}

export class Evaluator {
  private functions: Map<string, FunctionDeclNode> = new Map();
  private structs: Map<string, StructDeclNode> = new Map();
  private heap: Map<string, TreeNodeData> = new Map();
  private heapCounter: number = 0;
  private callStack: Frame[] = [];
  private trace: TraceEvent[] = [];
  private stdout: string = '';
  private maxSteps: number = 5000;
  private stepCount: number = 0;
  private ast: ProgramNode;
  private globals: Record<string, any> = {};
  private stdinTokens: string[] = [];
  private stdinIndex: number = 0;

  constructor(ast: ProgramNode, stdin: string = '') {
    this.ast = ast;
    this.stdinTokens = (stdin || '').trim().split(/\s+/).filter(Boolean);
    for (const stmt of ast.body) {
      if (stmt.type === 'FunctionDeclaration') {
        const fn = stmt as FunctionDeclNode;
        this.functions.set(fn.name, fn);
      } else if (stmt.type === 'StructDeclaration') {
        const s = stmt as StructDeclNode;
        this.structs.set(s.name, s);
      }
    }
  }

  private initVariableValue(varType: string, d: VariableDeclarator): any {
    const isVector = varType.startsWith('vector') || varType.startsWith('std::vector') || varType.startsWith('std:: vector');
    const isPair = varType.startsWith('pair') || varType.startsWith('std::pair') || varType.startsWith('std:: pair');
    const isQueue = varType.startsWith('queue') || varType.startsWith('std::queue');
    const isStack = varType.startsWith('stack') || varType.startsWith('std::stack');

    if (isQueue) {
      return { __type: 'queue', items: [] } as QueueObject;
    }
    if (isStack) {
      return { __type: 'stack', items: [] } as StackObject;
    }

    if (isVector) {
      const vectorDepth = (varType.match(/vector/g) || []).length;
      if (d.initializer) {
        const initVal = this.evaluateExpression(d.initializer);
        const vec = Array.isArray(initVal) ? createVector(initVal) : createVector();
        if (vectorDepth > 1) {
          (vec as any).__is2DVector = true;
          (vec as any).__nestingDepth = vectorDepth;
        }
        return vec;
      }
      if (d.constructorArgs && d.constructorArgs.length > 0) {
        const size = Number(this.evaluateExpression(d.constructorArgs[0])) || 0;
        const items: any[] = [];
        if (vectorDepth > 1) {
          for (let i = 0; i < size; i++) {
            const inner = createVector();
            if (vectorDepth - 1 > 1) {
              (inner as any).__is2DVector = true;
              (inner as any).__nestingDepth = vectorDepth - 1;
            }
            items.push(inner);
          }
        } else {
          let defaultVal: any = 0;
          if (d.constructorArgs.length > 1) {
            defaultVal = this.evaluateExpression(d.constructorArgs[1]);
          } else if (varType.includes('bool')) {
            defaultVal = false;
          } else if (varType.includes('string')) {
            defaultVal = '';
          } else if (varType.includes('pair')) {
            defaultVal = { first: 0, second: 0 };
          }
          for (let i = 0; i < size; i++) items.push(defaultVal);
        }
        const val = createVector(items);
        if (vectorDepth > 1) {
          (val as any).__is2DVector = true;
          (val as any).__nestingDepth = vectorDepth;
        }
        return val;
      }
      const val = createVector();
      if (vectorDepth > 1) {
        (val as any).__is2DVector = true;
        (val as any).__nestingDepth = vectorDepth;
      }
      return val;
    }

    if (isPair) {
      if (d.initializer) {
        const initVal = this.evaluateExpression(d.initializer);
        if (Array.isArray(initVal)) {
          return { first: initVal[0], second: initVal[1] };
        }
        if (typeof initVal === 'object' && initVal !== null) {
          return initVal;
        }
        return { first: 0, second: 0 };
      }
      const firstVal = varType.includes('<vector') || varType.includes('<std::vector') ? createVector() : 0;
      const secondVal =
        varType.includes(',vector') ||
        varType.includes(', vector') ||
        varType.includes(',std::vector') ||
        varType.includes(', std::vector')
          ? createVector()
          : 0;
      return { first: firstVal, second: secondVal };
    }

    if (this.structs.has(varType)) {
      const structDecl = this.structs.get(varType)!;
      const obj: Record<string, any> = {};
      for (const mem of structDecl.members) {
        obj[mem.name] = this.initVariableValue(mem.type, { name: mem.name });
      }
      return obj;
    }

    if (d.constructorArgs && d.constructorArgs.length > 0) {
      return this.evaluateExpression(d.constructorArgs[0]);
    }
    if (d.initializer) {
      return this.evaluateExpression(d.initializer);
    }
    if (
      varType === 'int' ||
      varType === 'long' ||
      varType === 'double' ||
      varType === 'float'
    ) {
      return 0;
    }
    if (varType === 'bool') return false;
    if (varType === 'string') return '';
    return undefined;
  }

  private readStdinToken(): string {
    if (this.stdinIndex < this.stdinTokens.length) {
      return this.stdinTokens[this.stdinIndex++];
    }
    return '0';
  }

  private getVariableValue(id: string): any {
    const frame = this.callStack[this.callStack.length - 1];
    if (frame) {
      if (frame.refs && frame.refs[id]) {
        return frame.refs[id].get();
      }
      if (Object.prototype.hasOwnProperty.call(frame.locals, id)) {
        return frame.locals[id];
      }
      if (Object.prototype.hasOwnProperty.call(frame.args, id)) {
        return frame.args[id];
      }
    }
    if (Object.prototype.hasOwnProperty.call(this.globals, id)) {
      return this.globals[id];
    }
    return 0;
  }

  private setVariableValue(id: string, val: any): void {
    const frame = this.callStack[this.callStack.length - 1];
    if (frame && frame.refs && frame.refs[id]) {
      frame.refs[id].set(val);
      return;
    }
    if (frame && Object.prototype.hasOwnProperty.call(frame.locals, id)) {
      frame.locals[id] = val;
    } else if (frame && Object.prototype.hasOwnProperty.call(frame.args, id)) {
      frame.args[id] = val;
    } else if (Object.prototype.hasOwnProperty.call(this.globals, id)) {
      this.globals[id] = val;
    } else if (frame) {
      frame.locals[id] = val;
    } else {
      this.globals[id] = val;
    }
  }

  public run(): InterpreterResult {
    try {
      // Initialize global variable declarations before entering main()
      for (const stmt of this.ast.body) {
        if (stmt.type === 'VariableDeclaration') {
          const decl = stmt as VariableDeclNode;
          const decls =
            decl.declarations && decl.declarations.length > 0
              ? decl.declarations
              : [
                  {
                    name: decl.name,
                    isArray: decl.isArray,
                    arraySize: decl.arraySize,
                    initializer: decl.initializer,
                    constructorArgs: decl.constructorArgs,
                  },
                ];

          for (const d of decls) {
            let val: any = undefined;
            if (d.isArray) {
              if (decl.varType.includes('vector')) {
                val = { __type: 'vector_array', map: new Map<any, any[]>() } as VectorArrayObject;
              } else if (d.initializer) {
                val = this.evaluateExpression(d.initializer);
              } else {
                val = [];
              }
            } else {
              val = this.initVariableValue(decl.varType, d);
            }
            this.globals[d.name] = val;
          }
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
      if (node.children && node.children.length > 0) {
        for (const ch of node.children) {
          if (this.heap.has(ch)) {
            incomingCount.set(ch, (incomingCount.get(ch) || 0) + 1);
          }
        }
      } else {
        if (node.left && this.heap.has(node.left)) {
          incomingCount.set(node.left, (incomingCount.get(node.left) || 0) + 1);
        }
        if (node.right && this.heap.has(node.right)) {
          incomingCount.set(node.right, (incomingCount.get(node.right) || 0) + 1);
        }
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
    } else if (this.callStack.length > 1) {
      // If called from main, check the first argument of the entry function (e.g. dfs(1, ...))
      const entryFrame = this.callStack[1];
      const entryArg = Object.values(entryFrame.args)[0];
      const argKey = entryArg !== undefined && entryArg !== null ? String(entryArg) : '';
      if (argKey && this.heap.has(argKey)) {
        rootId = argKey;
      }
    }
    if (!rootId && this.heap.size > 0) {
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

    const NON_POINTER_NAMES = new Set([
      'depth',
      'maxd',
      'mind',
      'max_depth',
      'min_depth',
      'maxdepth',
      'mindepth',
      'd',
      'dist',
      'distance',
      'n',
      'm',
      'k',
      'i',
      'j',
      'idx',
      'index',
      'sz',
      'size',
      'len',
      'length',
      'ans',
      'sum',
      'cnt',
      'count',
      'total',
      'val',
      'value',
      'cur',
      'target_sum',
      'targetsum',
      'runningsum',
      'running_sum',
      'acc',
      'accum',
      'diff',
      'difference',
      'isleaf',
      'timer',
      'tin',
      'tout',
      'cost',
      'wt',
      'weight',
      'height',
      'h',
    ]);

    const VALID_NODE_PARAM_NAMES = new Set([
      'root',
      'node',
      'curr',
      'parent',
      'child',
      'neighbour',
      'neighbor',
      'nxt',
      'next',
      'src',
      'dest',
      'target',
      'p',
      'q',
      'res',
      'temp',
    ]);

    if (currentFrame) {
      const allVars = { ...currentFrame.args, ...currentFrame.locals };
      for (const [varName, val] of Object.entries(allVars)) {
        if (NON_POINTER_NAMES.has(varName.toLowerCase())) continue;

        const idKey = typeof val === 'string' || typeof val === 'number' ? String(val) : null;
        if (idKey && this.heap.has(idKey)) {
          const isHeapPtr = typeof val === 'string' && val.startsWith('n');
          const isNodeVar =
            VALID_NODE_PARAM_NAMES.has(varName) ||
            (currentFrame.name !== 'main' && (varName === 'u' || varName === 'v'));

          if (!isHeapPtr && !isNodeVar) continue;

          let color = '#38bdf8';
          let displayName = varName;

          if (varName === 'root') {
            if (currentFrame.name !== 'main') {
              // Inner recursive parameter! Display with function scope so it's clear
              displayName = `${currentFrame.name}.root`;
              color = '#f59e0b'; // Amber to distinguish from top-level root
              activeNodeId = idKey;
            } else {
              // Already added above
              continue;
            }
          } else if (varName === 'node' || varName === 'curr') {
            color = '#38bdf8';
            activeNodeId = idKey;
          } else if (varName === 'parent') {
            color = '#a855f7';
          } else if (varName === 'p' || varName === 'q') {
            color = '#eab308';
          } else if (varName === 'temp') {
            color = '#ec4899';
          } else if (varName === 'res') {
            color = '#10b981';
          } else if (varName === 'v' || varName === 'child' || varName === 'neighbour' || varName === 'neighbor' || varName === 'nxt' || varName === 'next') {
            color = '#34d399';
          } else if (varName === 'u' || varName === 'src') {
            color = '#60a5fa';
          } else if (varName === 'dest' || varName === 'target') {
            color = '#f43f5e';
          }

          pointers.push({ name: displayName, nodeId: idKey, color });
          if (!activeNodeId && (varName === 'node' || varName === 'curr' || isHeapPtr)) {
            activeNodeId = idKey;
          }
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
        children: node.children ? [...node.children] : undefined,
        parent: null,
      };
      if (id === activeNodeId) {
        heapSnapshot[id].state = explanation.startsWith('cout') ? 'found' : 'active';
      }
    }

    // Traverse authoritative tree starting from rootId to assign tree parents
    // and orient tree edges from root downwards (removing back-edges to parents)
    if (rootId && heapSnapshot[rootId]) {
      const visited = new Set<string>();
      const queue = [rootId];
      visited.add(rootId);

      const treeChildren = new Map<string, string[]>();
      for (const id of Object.keys(heapSnapshot)) {
        treeChildren.set(id, []);
      }

      while (queue.length > 0) {
        const u = queue.shift()!;
        const curr = heapSnapshot[u];
        if (!curr) continue;

        if (curr.children && curr.children.length > 0) {
          for (const ch of curr.children) {
            if (heapSnapshot[ch] && !visited.has(ch)) {
              heapSnapshot[ch].parent = u;
              visited.add(ch);
              treeChildren.get(u)!.push(ch);
              queue.push(ch);
            }
          }
        } else {
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

      for (const [id, children] of treeChildren) {
        if (heapSnapshot[id].children) {
          heapSnapshot[id].children = children;
          heapSnapshot[id].left = null;
          heapSnapshot[id].right = null;
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
            const actualVal = f.refs && f.refs[k] ? f.refs[k].get() : v;
            if (typeof actualVal === 'string' && this.heap.has(actualVal)) {
              formattedArgs[k] = this.heap.get(actualVal)!.val;
            } else {
              formattedArgs[k] = actualVal;
            }
          }
          const formattedLocals: Record<string, any> = {};
          for (const [k, v] of Object.entries(f.locals)) {
            if (k === 'adj' || k === 'tree' || Array.isArray(v) || (v && typeof v === 'object' && v.__type)) continue;
            formattedLocals[k] = v;
          }
          return {
            id: `frame_${idx}`,
            functionName: `${f.name}()`,
            args: formattedArgs,
            locals: formattedLocals,
            status: 'active',
          };
        }),
        queue: queueState.length > 0 ? queueState : undefined,
        breadcrumbs: this.callStack.map((f) => {
          const argsStr = Object.entries(f.args)
            .map(([k, v]) => {
              const actualVal = f.refs && f.refs[k] ? f.refs[k].get() : v;
              return `${k}=${typeof actualVal === 'string' && this.heap.has(actualVal) ? this.heap.get(actualVal)!.val : actualVal}`;
            })
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
          const actualVal = f.refs && f.refs[k] ? f.refs[k].get() : v;
          if (typeof actualVal === 'string' && this.heap.has(actualVal)) {
            formattedArgs[k] = this.heap.get(actualVal)!.val;
          } else {
            formattedArgs[k] = actualVal;
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

  private callFunction(name: string, argExpressions: BaseASTNode[] = []): any {
    const fn = this.functions.get(name);
    if (!fn) {
      throw new Error(`Function '${name}' is not defined.`);
    }

    const callerFrame = this.callStack[this.callStack.length - 1];
    const args: Record<string, any> = Object.create(null);
    const refs: Record<string, { get: () => any; set: (val: any) => void }> = Object.create(null);
    const argValuesForLog: any[] = [];

    fn.params.forEach((param, idx) => {
      const argExpr = argExpressions[idx];
      const isRef = param.type.includes('&');

      if (isRef && argExpr) {
        if (argExpr.type === 'Identifier') {
          const varName = (argExpr as IdentifierNode).name;
          if (callerFrame && callerFrame.refs && callerFrame.refs[varName]) {
            refs[param.name] = callerFrame.refs[varName];
          } else if (callerFrame && Object.prototype.hasOwnProperty.call(callerFrame.locals, varName)) {
            const target = callerFrame.locals;
            refs[param.name] = {
              get: () => target[varName],
              set: (v: any) => {
                target[varName] = v;
              },
            };
          } else if (callerFrame && Object.prototype.hasOwnProperty.call(callerFrame.args, varName)) {
            const target = callerFrame.args;
            refs[param.name] = {
              get: () => target[varName],
              set: (v: any) => {
                target[varName] = v;
              },
            };
          } else {
            refs[param.name] = {
              get: () => this.globals[varName],
              set: (v: any) => {
                this.globals[varName] = v;
              },
            };
          }
          const val = refs[param.name].get();
          args[param.name] = val;
          argValuesForLog.push(val);
        } else if (argExpr.type === 'IndexAccessExpression') {
          const idxExpr = argExpr as IndexAccessNode;
          const obj = this.evaluateExpression(idxExpr.object);
          const index = this.evaluateExpression(idxExpr.index);
          refs[param.name] = {
            get: () => (obj ? obj[index] : undefined),
            set: (v: any) => {
              if (obj) obj[index] = v;
            },
          };
          const val = refs[param.name].get();
          args[param.name] = val;
          argValuesForLog.push(val);
        } else {
          let holder = this.evaluateExpression(argExpr);
          refs[param.name] = {
            get: () => holder,
            set: (v: any) => {
              holder = v;
            },
          };
          args[param.name] = holder;
          argValuesForLog.push(holder);
        }
      } else {
        const val = argExpr ? this.evaluateExpression(argExpr) : undefined;
        args[param.name] = val;
        argValuesForLog.push(val);
      }
    });

    const frame: Frame = {
      name,
      args,
      locals: Object.create(null),
      refs,
      line: fn.line,
    };

    this.callStack.push(frame);
    this.recordStep(fn.line, `Invoked function ${name}(${argValuesForLog.join(', ')})`);

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
        const decls =
          decl.declarations && decl.declarations.length > 0
            ? decl.declarations
            : [
                {
                  name: decl.name,
                  isArray: decl.isArray,
                  arraySize: decl.arraySize,
                  initializer: decl.initializer,
                  constructorArgs: decl.constructorArgs,
                },
              ];

        for (const d of decls) {
          let val: any = undefined;
          if (d.isArray) {
            if (decl.varType.includes('vector')) {
              val = { __type: 'vector_array', map: new Map<any, any[]>() } as VectorArrayObject;
            } else if (d.initializer) {
              val = this.evaluateExpression(d.initializer);
            } else {
              val = [];
            }
          } else {
            val = this.initVariableValue(decl.varType, d);
          }
          frame.locals[d.name] = val;
          this.recordStep(
            stmt.line,
            `Declared ${decl.varType} ${d.name}${d.isArray ? '[]' : ''}${val !== undefined && !d.isArray ? ` = ${typeof val === 'object' && val?.__type === 'queue' ? 'queue<>' : Array.isArray(val) ? `vector[${val.length}]` : val}` : ''}`
          );
        }
        return;
      }

      case 'AssignmentStatement': {
        const assign = stmt as AssignmentNode;
        const val = this.evaluateExpression(assign.value);
        this.setVariableValue(assign.target, val);
        this.recordStep(stmt.line, `Updated ${assign.target} = ${val}`);
        return;
      }

      case 'CompoundAssignmentStatement': {
        const comp = stmt as CompoundAssignmentNode;
        const val = this.evaluateExpression(comp.value);
        if (comp.target.type === 'Identifier') {
          const id = (comp.target as IdentifierNode).name;
          const currentVal = this.getVariableValue(id);
          let newVal = currentVal;
          if (comp.operator === '+=') newVal = currentVal + val;
          else if (comp.operator === '-=') newVal = currentVal - val;
          else if (comp.operator === '*=') newVal = currentVal * val;
          else if (comp.operator === '/=') {
            if (val === 0) throw new Error(`Runtime error: Division by zero at line ${stmt.line}`);
            newVal = Math.trunc(currentVal / val);
          } else if (comp.operator === '%=') {
            if (val === 0) throw new Error(`Runtime error: Modulo by zero at line ${stmt.line}`);
            newVal = currentVal % val;
          }
          this.setVariableValue(id, newVal);
          this.recordStep(stmt.line, `${id} ${comp.operator} ${val} -> ${newVal}`);
        } else if (comp.target.type === 'IndexAccessExpression') {
          const idxExpr = comp.target as IndexAccessNode;
          const obj = this.evaluateExpression(idxExpr.object);
          const idx = this.evaluateExpression(idxExpr.index);
          const currentVal =
            obj && typeof obj === 'object'
              ? obj.__type === 'vector_array'
                ? obj.map.get(idx) || 0
                : obj[idx] || 0
              : 0;
          let newVal = currentVal;
          if (comp.operator === '+=') newVal = currentVal + val;
          else if (comp.operator === '-=') newVal = currentVal - val;
          else if (comp.operator === '*=') newVal = currentVal * val;
          else if (comp.operator === '/=') {
            if (val === 0) throw new Error(`Runtime error: Division by zero at line ${stmt.line}`);
            newVal = Math.trunc(currentVal / val);
          } else if (comp.operator === '%=') {
            if (val === 0) throw new Error(`Runtime error: Modulo by zero at line ${stmt.line}`);
            newVal = currentVal % val;
          }
          if (obj && typeof obj === 'object') {
            if (obj.__type === 'vector_array') obj.map.set(idx, newVal);
            else obj[idx] = newVal;
          }
          this.recordStep(stmt.line, `[${idx}] ${comp.operator} ${val} -> ${newVal}`);
        } else if (comp.target.type === 'MemberAccessExpression') {
          const mem = comp.target as MemberAccessNode;
          const obj = this.evaluateExpression(mem.object);
          const prop = mem.property;
          const currentVal = obj && typeof obj === 'object' ? obj[prop] || 0 : 0;
          let newVal = currentVal;
          if (comp.operator === '+=') newVal = currentVal + val;
          else if (comp.operator === '-=') newVal = currentVal - val;
          else if (comp.operator === '*=') newVal = currentVal * val;
          if (obj && typeof obj === 'object') obj[prop] = newVal;
        }
        return;
      }

      case 'IndexAssignmentStatement': {
        const idxAssign = stmt as IndexAssignmentNode;
        const obj = this.evaluateExpression(idxAssign.object);
        const idx = this.evaluateExpression(idxAssign.index);
        const val = this.evaluateExpression(idxAssign.value);
        if (obj && typeof obj === 'object') {
          if (obj.__type === 'vector_array') {
            obj.map.set(idx, val);
          } else {
            obj[idx] = val;
          }
        }
        this.recordStep(stmt.line, `Assigned index [${idx}] = ${val}`);
        return;
      }

      case 'ForStatement': {
        const forStmt = stmt as ForStatementNode;
        if (forStmt.init) {
          this.executeStatement(forStmt.init);
        }
        while (true) {
          if (forStmt.condition) {
            const cond = this.evaluateExpression(forStmt.condition);
            if (!cond) break;
          }
          this.recordStep(stmt.line, `Loop condition true, executing iteration`);
          const res = this.executeStatement(forStmt.body);
          if (res && res.__return__) return res;
          if (res && res.__break__) break;
          if (res && res.__continue__) {
            if (forStmt.update) {
              this.evaluateExpression(forStmt.update);
            }
            continue;
          }
          if (forStmt.update) {
            this.evaluateExpression(forStmt.update);
          }
        }
        return;
      }

      case 'RangeForStatement': {
        const rangeFor = stmt as RangeForStatementNode;
        const iterable = this.evaluateExpression(rangeFor.iterable);
        const items = Array.isArray(iterable) ? iterable : [];
        for (const item of items) {
          frame.locals[rangeFor.varName] = item;
          this.recordStep(
            stmt.line,
            `for (${rangeFor.varName} : tree): ${rangeFor.varName} = ${item}`
          );
          const res = this.executeStatement(rangeFor.body);
          if (res && res.__return__) return res;
          if (res && res.__break__) break;
          if (res && res.__continue__) continue;
        }
        return;
      }

      case 'BreakStatement': {
        return { __break__: true };
      }

      case 'ContinueStatement': {
        return { __continue__: true };
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
        } else if (typeof objVal === 'object' && objVal !== null) {
          (objVal as any)[prop] = val;
          this.recordStep(stmt.line, `Assigned member .${prop} = ${val}`);
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
          if (res && res.__break__) break;
          if (res && res.__continue__) continue;
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
          if (res && (res.__return__ || res.__break__ || res.__continue__)) return res;
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
        if (id === 'endl' || id === 'std::endl') return 'endl';
        if (id === 'cout' || id === 'std::cout') return 'cout';
        if (id === 'cin' || id === 'std::cin') return 'cin';
        if (id === 'INT_MIN' || id === 'LONG_MIN') return -2147483648;
        if (id === 'INT_MAX' || id === 'LONG_MAX') return 2147483647;

        // P0: Safe check against frame.locals, frame.args, and frame.refs without prototype pollution
        if (frame) {
          if (frame.refs && frame.refs[id]) {
            return frame.refs[id].get();
          }
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

      case 'IndexAccessExpression': {
        const idxExpr = expr as IndexAccessNode;
        const obj = this.evaluateExpression(idxExpr.object);
        const idx = this.evaluateExpression(idxExpr.index);

        if (obj && typeof obj === 'object') {
          if (obj.__type === 'vector_array') {
            if (!obj.map.has(idx)) {
              obj.map.set(idx, createVector());
            }
            return obj.map.get(idx);
          }
          if (Array.isArray(obj)) {
            if (obj[idx] === undefined) {
              if ((obj as any).__is2DVector) {
                const depth = (obj as any).__nestingDepth || 2;
                const inner = createVector();
                if (depth - 1 > 1) {
                  (inner as any).__is2DVector = true;
                  (inner as any).__nestingDepth = depth - 1;
                }
                obj[idx] = inner;
              } else {
                return 0;
              }
            }
            return obj[idx];
          }
          return (obj as any)[idx];
        }
        return undefined;
      }

      case 'UpdateExpression': {
        const update = expr as UpdateExpressionNode;
        if (update.argument.type === 'Identifier') {
          const id = (update.argument as IdentifierNode).name;
          const currentVal = Number(this.getVariableValue(id)) || 0;
          const diff = update.operator === '++' ? 1 : -1;
          const newVal = currentVal + diff;
          this.setVariableValue(id, newVal);
          return update.prefix ? newVal : currentVal;
        } else if (update.argument.type === 'IndexAccessExpression') {
          const idxExpr = update.argument as IndexAccessNode;
          const obj = this.evaluateExpression(idxExpr.object);
          const idx = this.evaluateExpression(idxExpr.index);
          const currentVal = Number(obj[idx]) || 0;
          const diff = update.operator === '++' ? 1 : -1;
          const newVal = currentVal + diff;
          obj[idx] = newVal;
          return update.prefix ? newVal : currentVal;
        }
        throw new Error(`Invalid operand for ${update.operator} at line ${expr.line}`);
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
          case '*':
            if (typeof argVal === 'string' && this.heap.has(argVal)) {
              return this.heap.get(argVal)!.val;
            }
            return typeof argVal === 'object' && argVal !== null && argVal.val !== undefined ? argVal.val : argVal;
          case '&':
            return argVal;
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
              const displayVal = typeof rightVal === 'boolean' ? (rightVal ? '1' : '0') : String(rightVal);
              this.stdout += displayVal;
              this.recordStep(expr.line, `cout << ${displayVal}`);
            }
            return 'cout';
          }
        }

        // cin >> value
        if (bin.operator === '>>') {
          const leftVal = this.evaluateExpression(bin.left);
          if (leftVal === 'cin') {
            const token = this.readStdinToken();
            const val = !isNaN(Number(token)) && token !== '' ? Number(token) : token;

            if (bin.right.type === 'Identifier') {
              const id = (bin.right as IdentifierNode).name;
              this.setVariableValue(id, val);
              this.recordStep(expr.line, `cin >> ${id} (read ${val})`);
            } else if (bin.right.type === 'IndexAccessExpression') {
              const idxExpr = bin.right as IndexAccessNode;
              const obj = this.evaluateExpression(idxExpr.object);
              const idx = this.evaluateExpression(idxExpr.index);
              if (obj && typeof obj === 'object') {
                if (obj.__type === 'vector_array') obj.map.set(idx, val);
                else obj[idx] = val;
              }
              this.recordStep(expr.line, `cin >> [${idx}] (read ${val})`);
            }
            return 'cin';
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
          case '<<':
            return leftVal << rightVal;
          case '>>':
            return leftVal >> rightVal;
          case '&':
            return leftVal & rightVal;
          case '|':
            return leftVal | rightVal;
          case '^':
            return leftVal ^ rightVal;
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
        if (obj && typeof obj === 'object') {
          return (obj as any)[mem.property];
        }
        throw new Error(`Runtime error: Cannot access member '${mem.property}' on non-heap object at line ${expr.line}`);
      }

      case 'MemberCallExpression': {
        const memCall = expr as MemberCallExpressionNode;
        const obj = this.evaluateExpression(memCall.object);
        const args = memCall.args.map((a) => this.evaluateExpression(a));

        if (obj === 'cin' || obj === 'cout') {
          // Standard stream methods e.g. cin.tie(NULL);
          return 0;
        }

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

        if (obj && typeof obj === 'object' && obj.__type === 'stack') {
          const st = obj as StackObject;
          if (memCall.method === 'push') {
            st.items.push(args[0]);
            const valDisplay =
              typeof args[0] === 'string' && this.heap.has(args[0]) ? this.heap.get(args[0])!.val : args[0];
            this.recordStep(expr.line, `st.push(${valDisplay})`);
            return;
          }
          if (memCall.method === 'pop') {
            const popped = st.items.pop();
            const valDisplay =
              typeof popped === 'string' && this.heap.has(popped) ? this.heap.get(popped)!.val : popped;
            this.recordStep(expr.line, `st.pop() -> removed ${valDisplay}`);
            return popped;
          }
          if (memCall.method === 'top') {
            if (st.items.length === 0) {
              throw new Error(`Runtime error: st.top() called on empty stack at line ${expr.line}`);
            }
            return st.items[st.items.length - 1];
          }
          if (memCall.method === 'empty') {
            return st.items.length === 0;
          }
          if (memCall.method === 'size') {
            return st.items.length;
          }
        }

        // Vector support e.g. tree[u].push_back(v) or vec.size()
        if (Array.isArray(obj) || (obj && typeof obj === 'object' && (obj as any).__type === 'vector')) {
          if (memCall.method === 'push_back' || memCall.method === 'push') {
            const val = args[0];
            if (Array.isArray(val) && val.length === 2 && (val as any).first === undefined) {
              (val as any).first = val[0];
              (val as any).second = val[1];
            }
            obj.push(val);

            // If this vector represents an adjacency list node, e.g. tree[u].push_back(v)
            if (memCall.object.type === 'IndexAccessExpression') {
              const idxExpr = memCall.object as IndexAccessNode;
              const parentId = this.evaluateExpression(idxExpr.index);
              const childId = val && typeof val === 'object' && val.first !== undefined ? val.first : val;
              const pStr = String(parentId);
              const cStr = String(childId);

              if (!this.heap.has(pStr)) {
                this.heap.set(pStr, {
                  id: pStr,
                  val: parentId,
                  left: null,
                  right: null,
                  parent: null,
                  children: [],
                  state: 'default',
                });
              }
              if (!this.heap.has(cStr)) {
                this.heap.set(cStr, {
                  id: cStr,
                  val: childId,
                  left: null,
                  right: null,
                  parent: pStr,
                  children: [],
                  state: 'default',
                });
              }

              const pNode = this.heap.get(pStr)!;
              if (!pNode.children) pNode.children = [];
              if (!pNode.children.includes(cStr)) {
                pNode.children.push(cStr);
              }
              const cNode = this.heap.get(cStr)!;
              if (!cNode.parent) cNode.parent = pStr;
            }

            this.recordStep(expr.line, `push_back(${val})`);
            return;
          }
          if (memCall.method === 'pop_back') {
            const popped = obj.pop();
            this.recordStep(expr.line, `pop_back() -> ${popped}`);
            return popped;
          }
          if (memCall.method === 'size') {
            return obj.length;
          }
          if (memCall.method === 'empty') {
            return obj.length === 0;
          }
          if (memCall.method === 'clear') {
            obj.length = 0;
            return;
          }
          if (memCall.method === 'resize') {
            const newSize = Number(args[0]) || 0;
            const isNested = (obj as any).__is2DVector;
            const depth = (obj as any).__nestingDepth || (isNested ? 2 : 1);
            while (obj.length < newSize) {
              if (args.length > 1) {
                obj.push(args[1]);
              } else if (isNested && depth > 1) {
                const inner = createVector();
                if (depth - 1 > 1) {
                  (inner as any).__is2DVector = true;
                  (inner as any).__nestingDepth = depth - 1;
                }
                obj.push(inner);
              } else {
                obj.push(0);
              }
            }
            obj.length = newSize;
            return;
          }
          if (memCall.method === 'back') {
            return obj[obj.length - 1];
          }
          if (memCall.method === 'front') {
            return obj[0];
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

      case 'ArrayLiteral': {
        return (expr as ArrayLiteralNode).elements.map((e) => this.evaluateExpression(e));
      }

      case 'CallExpression': {
        const call = expr as CallExpressionNode;
        const callee = call.callee;

        if (callee === 'max' || callee === 'std::max') {
          const a = this.evaluateExpression(call.args[0]);
          const b = this.evaluateExpression(call.args[1]);
          return Math.max(a, b);
        }
        if (callee === 'min' || callee === 'std::min') {
          const a = this.evaluateExpression(call.args[0]);
          const b = this.evaluateExpression(call.args[1]);
          return Math.min(a, b);
        }
        if (callee === 'abs' || callee === 'std::abs') {
          const a = this.evaluateExpression(call.args[0]);
          return Math.abs(a);
        }
        if (callee === 'sqrt' || callee === 'std::sqrt') {
          const a = this.evaluateExpression(call.args[0]);
          return Math.sqrt(a);
        }
        if (callee === 'pow' || callee === 'std::pow') {
          const a = this.evaluateExpression(call.args[0]);
          const b = this.evaluateExpression(call.args[1]);
          return Math.pow(a, b);
        }
        if (callee === 'swap' || callee === 'std::swap') {
          const arg0 = call.args[0];
          const arg1 = call.args[1];
          const v0 = this.evaluateExpression(arg0);
          const v1 = this.evaluateExpression(arg1);
          if (arg0.type === 'Identifier') {
            this.setVariableValue((arg0 as IdentifierNode).name, v1);
          }
          if (arg1.type === 'Identifier') {
            this.setVariableValue((arg1 as IdentifierNode).name, v0);
          }
          return;
        }
        if (callee === 'make_pair' || callee === 'std::make_pair') {
          const first = this.evaluateExpression(call.args[0]);
          const second = this.evaluateExpression(call.args[1]);
          return { first, second };
        }
        if (callee === 'ios_base::sync_with_stdio' || callee === 'sync_with_stdio') {
          return 0;
        }

        return this.callFunction(call.callee, call.args);
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
