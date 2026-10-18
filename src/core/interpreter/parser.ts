/**
 * C++ Parser for Tree & Graph Visualizer
 */

import type { Token } from '../../types/interpreter';
import type {
  BaseASTNode,
  ProgramNode,
  FunctionDeclNode,
  StructDeclNode,
  VariableDeclNode,
  VariableDeclarator,
  AssignmentNode,
  CompoundAssignmentNode,
  MemberAssignmentNode,
  IndexAssignmentNode,
  IfStatementNode,
  WhileStatementNode,
  ForStatementNode,
  RangeForStatementNode,
  BreakStatementNode,
  ContinueStatementNode,
  ReturnStatementNode,
  BlockStatementNode,
  EmptyStatementNode,
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
} from './ast';

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '', line: -1, col: -1 };
  }

  private peekNext(): Token {
    return this.tokens[this.pos + 1] || { type: 'EOF', value: '', line: -1, col: -1 };
  }

  private advance(): Token {
    const t = this.peek();
    if (t.type !== 'EOF') this.pos++;
    return t;
  }

  private match(val: string): boolean {
    if (this.peek().value === val) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(val: string): Token {
    const t = this.peek();
    if (t.value !== val) {
      throw new Error(`Expected '${val}' at line ${t.line}, but found '${t.value}'`);
    }
    return this.advance();
  }

  public parseProgram(): ProgramNode {
    const body: BaseASTNode[] = [];
    const startLine = this.peek().line;

    while (this.peek().type !== 'EOF') {
      const stmt = this.parseTopLevel();
      if (stmt) body.push(stmt);
    }

    return { type: 'Program', line: startLine, body };
  }

  private parseTopLevel(): BaseASTNode | null {
    // Skip 'using namespace std;'
    if (this.peek().value === 'using') {
      while (this.peek().type !== 'EOF' && this.peek().value !== ';') {
        this.advance();
      }
      this.match(';');
      return null;
    }

    // struct declaration
    if (this.peek().value === 'struct') {
      return this.parseStruct();
    }

    // Function or variable declaration
    return this.parseFunctionOrVar();
  }

  private parseStruct(): StructDeclNode {
    const structToken = this.advance(); // 'struct'
    const nameToken = this.advance();
    const members: { type: string; name: string }[] = [];

    this.expect('{');
    while (this.peek().type !== 'EOF' && this.peek().value !== '}') {
      const typeStr = this.parseTypeString();
      const memName = this.advance().value;
      members.push({ type: typeStr, name: memName });
      this.match(';');
    }
    this.expect('}');
    this.match(';');

    return {
      type: 'StructDeclaration',
      line: structToken.line,
      name: nameToken.value,
      members,
    };
  }

  private parseTypeString(): string {
    let typeStr = '';
    // Qualifiers: const, static, unsigned, signed
    while (
      this.peek().value === 'const' ||
      this.peek().value === 'static' ||
      this.peek().value === 'unsigned' ||
      this.peek().value === 'signed'
    ) {
      typeStr += (typeStr ? ' ' : '') + this.advance().value;
    }

    if (this.peek().type !== 'EOF' && this.peek().value !== ';' && this.peek().value !== '{') {
      typeStr += (typeStr ? ' ' : '') + this.advance().value;
    }

    // Long long
    if (typeStr.endsWith('long') && this.peek().value === 'long') {
      typeStr += ' ' + this.advance().value;
    }

    while (this.peek().value === '*' || this.peek().value === '&' || this.peek().value === '<') {
      if (this.peek().value === '<') {
        typeStr += this.advance().value;
        let depth = 1;
        while (this.peek().type !== 'EOF' && depth > 0) {
          if (this.peek().value === '<') depth++;
          else if (this.peek().value === '>') depth--;
          typeStr += this.advance().value;
        }
      } else {
        typeStr += this.advance().value;
      }
    }
    return typeStr;
  }

  private parseDeclarator(): VariableDeclarator {
    const name = this.advance().value;
    let isArray = false;
    let arraySize: BaseASTNode | undefined;
    if (this.match('[')) {
      isArray = true;
      if (this.peek().value !== ']') {
        arraySize = this.parseExpression();
      }
      this.expect(']');
    }
    let constructorArgs: BaseASTNode[] | undefined;
    if (this.match('(')) {
      constructorArgs = [];
      while (this.peek().type !== 'EOF' && this.peek().value !== ')') {
        constructorArgs.push(this.parseExpression());
        if (this.peek().value === ',') this.advance();
      }
      this.expect(')');
    }
    let initializer: BaseASTNode | undefined;
    if (this.match('=')) {
      initializer = this.parseExpression();
    }
    return { name, isArray, arraySize, initializer, constructorArgs };
  }

  private parseFunctionOrVar(): BaseASTNode {
    const startLine = this.peek().line;
    const typeStr = this.parseTypeString();
    const name = this.advance().value;

    // Function declaration: type name ( ... ) { ... }
    if (this.peek().value === '(') {
      let isFunc = false;
      let depth = 0;
      for (let i = this.pos; i < this.tokens.length; i++) {
        if (this.tokens[i].value === '(') depth++;
        else if (this.tokens[i].value === ')') {
          depth--;
          if (depth === 0) {
            if (i + 1 < this.tokens.length && this.tokens[i + 1].value === '{') {
              isFunc = true;
            }
            break;
          }
        }
      }

      if (isFunc) {
        this.advance(); // '('
        const params: { type: string; name: string }[] = [];
        while (this.peek().type !== 'EOF' && this.peek().value !== ')') {
          const pType = this.parseTypeString();
          const pName = this.advance().value;
          params.push({ type: pType, name: pName });
          if (this.peek().value === ',') this.advance();
        }
        this.expect(')');
        const body = this.parseBlock();
        return {
          type: 'FunctionDeclaration',
          line: startLine,
          returnType: typeStr,
          name,
          params,
          body,
        } as FunctionDeclNode;
      }
    }

    // Top-level variable declaration(s)
    let isArray = false;
    let arraySize: BaseASTNode | undefined;
    if (this.match('[')) {
      isArray = true;
      if (this.peek().value !== ']') {
        arraySize = this.parseExpression();
      }
      this.expect(']');
    }

    let constructorArgs: BaseASTNode[] | undefined;
    if (this.match('(')) {
      constructorArgs = [];
      while (this.peek().type !== 'EOF' && this.peek().value !== ')') {
        constructorArgs.push(this.parseExpression());
        if (this.peek().value === ',') this.advance();
      }
      this.expect(')');
    }

    let initializer: BaseASTNode | undefined;
    if (this.match('=')) {
      initializer = this.parseExpression();
    }

    const firstDecl: VariableDeclarator = { name, isArray, arraySize, initializer, constructorArgs };
    const declarations: VariableDeclarator[] = [firstDecl];

    while (this.match(',')) {
      declarations.push(this.parseDeclarator());
    }

    this.match(';');

    return {
      type: 'VariableDeclaration',
      line: startLine,
      varType: typeStr,
      name,
      initializer,
      isArray,
      arraySize,
      constructorArgs,
      declarations,
    } as VariableDeclNode;
  }

  public parseBlock(): BlockStatementNode {
    const startLine = this.peek().line;
    this.expect('{');
    const body: BaseASTNode[] = [];

    while (this.peek().type !== 'EOF' && this.peek().value !== '}') {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }
    this.expect('}');

    return { type: 'BlockStatement', line: startLine, body };
  }

  public parseStatement(): BaseASTNode {
    const token = this.peek();

    if (token.value === ';') {
      this.advance();
      return { type: 'EmptyStatement', line: token.line } as EmptyStatementNode;
    }

    if (token.value === '{') {
      return this.parseBlock();
    }

    if (token.value === 'if') {
      return this.parseIf();
    }

    if (token.value === 'while') {
      return this.parseWhile();
    }

    if (token.value === 'for') {
      return this.parseFor();
    }

    if (token.value === 'break') {
      this.advance();
      if (!this.match(';')) this.expect(';');
      return { type: 'BreakStatement', line: token.line } as BreakStatementNode;
    }

    if (token.value === 'continue') {
      this.advance();
      if (!this.match(';')) this.expect(';');
      return { type: 'ContinueStatement', line: token.line } as ContinueStatementNode;
    }

    if (token.value === 'return') {
      return this.parseReturn();
    }

    // Variable declaration or expression statement
    const KNOWN_TYPE_NAMES = new Set([
      'int',
      'void',
      'bool',
      'string',
      'auto',
      'char',
      'float',
      'double',
      'long',
      'const',
      'static',
      'unsigned',
      'signed',
      'TreeNode',
      'Node',
      'ListNode',
      'queue',
      'vector',
      'stack',
    ]);
    const next = this.peekNext();
    if (
      KNOWN_TYPE_NAMES.has(token.value) ||
      (token.type === 'IDENTIFIER' && KNOWN_TYPE_NAMES.has(token.value) && (next.value === '*' || next.value === '<' || next.value === '&')) ||
      (token.type === 'IDENTIFIER' && next.type === 'IDENTIFIER' && KNOWN_TYPE_NAMES.has(token.value))
    ) {
      return this.parseVarDecl();
    }

    // Member assignment e.g. root->left = ... or expression statement
    return this.parseAssignmentOrExpr();
  }

  private parseIf(): IfStatementNode {
    const token = this.advance(); // 'if'
    this.expect('(');
    const condition = this.parseExpression();
    this.expect(')');
    const consequent = this.peek().value === '{' ? this.parseBlock() : this.parseStatement();
    let alternate: BaseASTNode | undefined;
    if (this.match('else')) {
      alternate = this.peek().value === '{' ? this.parseBlock() : this.parseStatement();
    }
    return {
      type: 'IfStatement',
      line: token.line,
      condition,
      consequent,
      alternate,
    };
  }

  private parseWhile(): WhileStatementNode {
    const token = this.advance(); // 'while'
    this.expect('(');
    const condition = this.parseExpression();
    this.expect(')');
    const body = this.peek().value === '{' ? this.parseBlock() : this.parseStatement();
    return {
      type: 'WhileStatement',
      line: token.line,
      condition,
      body,
    };
  }

  private parseFor(): BaseASTNode {
    const forToken = this.advance(); // 'for'
    this.expect('(');

    // Look ahead to detect range-based for loop:
    // e.g. for (auto i: tree[node]) or for (auto i : tree[node]) or for (int x : vec)
    const savedPos = this.pos;
    let isRangeFor = false;
    let rangeVarType = '';
    let rangeVarName = '';

    try {
      const typeStr = this.parseTypeString();
      if (this.peek().type === 'IDENTIFIER' || this.peek().type === 'KEYWORD') {
        const idToken = this.advance();
        if (this.peek().value === ':') {
          isRangeFor = true;
          rangeVarType = typeStr;
          rangeVarName = idToken.value;
        }
      }
    } catch {
      // not a range for
    }

    if (isRangeFor) {
      this.expect(':');
      const iterable = this.parseExpression();
      this.expect(')');
      const body = this.peek().value === '{' ? this.parseBlock() : this.parseStatement();
      return {
        type: 'RangeForStatement',
        line: forToken.line,
        varType: rangeVarType,
        varName: rangeVarName,
        iterable,
        body,
      } as RangeForStatementNode;
    }

    // Reset position for standard 3-clause for loop
    this.pos = savedPos;

    // 1. init: e.g. int i = 0; or i = 0; or ;
    let init: BaseASTNode | undefined;
    if (this.peek().value === ';') {
      this.advance();
    } else {
      const KNOWN_TYPE_NAMES = new Set([
        'int',
        'void',
        'bool',
        'string',
        'auto',
        'char',
        'float',
        'double',
        'long',
        'const',
        'TreeNode',
        'Node',
        'ListNode',
        'queue',
        'vector',
        'stack',
      ]);
      if (KNOWN_TYPE_NAMES.has(this.peek().value)) {
        init = this.parseVarDecl(true);
      } else {
        init = this.parseAssignmentOrExpr(true);
      }
    }

    // 2. condition: e.g. i < n - 1; or ;
    let condition: BaseASTNode | undefined;
    if (this.peek().value !== ';') {
      condition = this.parseExpression();
    }
    this.expect(';');

    // 3. update: e.g. i++ or i += 1 or i = i + 1
    let update: BaseASTNode | undefined;
    if (this.peek().value !== ')') {
      update = this.parseExpression();
    }
    this.expect(')');

    // 4. body
    const body = this.peek().value === '{' ? this.parseBlock() : this.parseStatement();

    return {
      type: 'ForStatement',
      line: forToken.line,
      init,
      condition,
      update,
      body,
    } as ForStatementNode;
  }

  private parseReturn(): ReturnStatementNode {
    const token = this.advance(); // 'return'
    let argument: BaseASTNode | undefined;
    if (this.peek().value !== ';') {
      argument = this.parseExpression();
    }
    if (!this.match(';')) this.expect(';');
    return {
      type: 'ReturnStatement',
      line: token.line,
      argument,
    };
  }

  private parseVarDecl(consumeSemicolon: boolean = true): VariableDeclNode {
    const startLine = this.peek().line;
    const typeStr = this.parseTypeString();
    const firstDecl = this.parseDeclarator();
    const declarations = [firstDecl];

    while (this.match(',')) {
      declarations.push(this.parseDeclarator());
    }

    if (consumeSemicolon && !this.match(';')) {
      this.expect(';');
    }

    return {
      type: 'VariableDeclaration',
      line: startLine,
      varType: typeStr,
      name: firstDecl.name,
      initializer: firstDecl.initializer,
      isArray: firstDecl.isArray,
      arraySize: firstDecl.arraySize,
      constructorArgs: firstDecl.constructorArgs,
      declarations,
    };
  }

  private parseAssignmentOrExpr(consumeSemicolon: boolean = true): BaseASTNode {
    const expr = this.parseExpression();

    const compoundOps = ['+=', '-=', '*=', '/=', '%='];
    if (compoundOps.includes(this.peek().value)) {
      const op = this.advance().value as '+=' | '-=' | '*=' | '/=' | '%=';
      const val = this.parseExpression();
      if (consumeSemicolon && !this.match(';')) this.expect(';');
      return {
        type: 'CompoundAssignmentStatement',
        line: expr.line,
        target: expr,
        operator: op,
        value: val,
      } as CompoundAssignmentNode;
    }

    if (this.match('=')) {
      const val = this.parseExpression();
      if (consumeSemicolon && !this.match(';')) this.expect(';');

      if (expr.type === 'Identifier') {
        return {
          type: 'AssignmentStatement',
          line: expr.line,
          target: (expr as IdentifierNode).name,
          value: val,
        } as AssignmentNode;
      } else if (expr.type === 'MemberAccessExpression') {
        const mem = expr as MemberAccessNode;
        return {
          type: 'MemberAssignmentStatement',
          line: expr.line,
          object: mem.object,
          property: mem.property,
          value: val,
        } as MemberAssignmentNode;
      } else if (expr.type === 'IndexAccessExpression') {
        const idx = expr as IndexAccessNode;
        return {
          type: 'IndexAssignmentStatement',
          line: expr.line,
          object: idx.object,
          index: idx.index,
          value: val,
        } as IndexAssignmentNode;
      } else {
        throw new Error(`Invalid assignment target at line ${expr.line}`);
      }
    }

    if (consumeSemicolon && !this.match(';')) this.expect(';');
    return {
      type: 'ExpressionStatement',
      line: expr.line,
      expression: expr,
    } as ExpressionStatementNode;
  }

  public parseExpression(): BaseASTNode {
    let expr = this.parseBinary(0);
    if (this.match('?')) {
      const consequent = this.parseExpression();
      this.expect(':');
      const alternate = this.parseExpression();
      return {
        type: 'ConditionalExpression',
        line: expr.line,
        condition: expr,
        consequent,
        alternate,
      } as ConditionalExpressionNode;
    }
    return expr;
  }

  private parseBinary(minPrec: number): BaseASTNode {
    let left = this.parsePrimary();

    // Standard C++ operator precedence
    const precMap: Record<string, number> = {
      '||': 1,
      '&&': 2,
      '==': 3,
      '!=': 3,
      '<': 4,
      '>': 4,
      '<=': 4,
      '>=': 4,
      '<<': 5,
      '>>': 5,
      '+': 6,
      '-': 6,
      '*': 7,
      '/': 7,
      '%': 7,
    };

    while (this.peek().type === 'OPERATOR' && precMap[this.peek().value] >= minPrec) {
      const op = this.advance().value;
      const prec = precMap[op];
      const right = this.parseBinary(prec + 1);
      left = {
        type: 'BinaryExpression',
        line: left.line,
        operator: op,
        left,
        right,
      } as BinaryExpressionNode;
    }

    return left;
  }

  private parsePrimary(): BaseASTNode {
    const token = this.peek();

    // Prefix ++ and --
    if (token.value === '++' || token.value === '--') {
      this.advance();
      const argument = this.parsePrimary();
      return {
        type: 'UpdateExpression',
        line: token.line,
        operator: token.value as '++' | '--',
        argument,
        prefix: true,
      } as UpdateExpressionNode;
    }

    // Unary operators (!, -, +, ~)
    if (token.value === '!' || token.value === '~' || token.value === '+' || token.value === '-') {
      this.advance();
      const argument = this.parsePrimary();
      return {
        type: 'UnaryExpression',
        line: token.line,
        operator: token.value,
        argument,
      } as UnaryExpressionNode;
    }

    if (token.value === 'new') {
      this.advance();
      const typeName = this.advance().value;
      const args: BaseASTNode[] = [];
      if (this.match('(')) {
        while (this.peek().type !== 'EOF' && this.peek().value !== ')') {
          args.push(this.parseExpression());
          if (this.peek().value === ',') this.advance();
        }
        this.expect(')');
      }
      return {
        type: 'NewExpression',
        line: token.line,
        typeName,
        args,
      } as NewExpressionNode;
    }

    if (token.value === '(') {
      this.advance();
      const expr = this.parseExpression();
      this.expect(')');
      return this.parsePostfix(expr);
    }

    if (token.type === 'NUMBER') {
      this.advance();
      return {
        type: 'Literal',
        line: token.line,
        value: Number(token.value),
        raw: token.value,
      } as LiteralNode;
    }

    if (token.type === 'STRING') {
      this.advance();
      return {
        type: 'Literal',
        line: token.line,
        value: token.value,
        raw: `"${token.value}"`,
      } as LiteralNode;
    }

    if (token.value === 'nullptr' || token.value === 'NULL') {
      this.advance();
      return {
        type: 'Literal',
        line: token.line,
        value: null,
        raw: token.value,
      } as LiteralNode;
    }

    if (token.value === 'true' || token.value === 'false') {
      this.advance();
      return {
        type: 'Literal',
        line: token.line,
        value: token.value === 'true',
        raw: token.value,
      } as LiteralNode;
    }

    if (token.type === 'IDENTIFIER' || token.type === 'KEYWORD') {
      this.advance();
      let node: BaseASTNode = {
        type: 'Identifier',
        line: token.line,
        name: token.value,
      } as IdentifierNode;

      return this.parsePostfix(node);
    }

    throw new Error(`Unexpected token '${token.value}' at line ${token.line}`);
  }

  private parsePostfix(expr: BaseASTNode): BaseASTNode {
    while (true) {
      // Postfix ++ and --
      if (this.peek().value === '++' || this.peek().value === '--') {
        const op = this.advance().value as '++' | '--';
        expr = {
          type: 'UpdateExpression',
          line: expr.line,
          operator: op,
          argument: expr,
          prefix: false,
        } as UpdateExpressionNode;
        continue;
      }

      // Member access e.g. root->left or q.front()
      if (this.peek().value === '->' || this.peek().value === '.') {
        this.advance();
        const prop = this.advance().value;
        expr = {
          type: 'MemberAccessExpression',
          line: expr.line,
          object: expr,
          property: prop,
        } as MemberAccessNode;
        continue;
      }

      // Array subscript e.g. tree[node] or arr[i]
      if (this.peek().value === '[') {
        this.advance(); // '['
        const index = this.parseExpression();
        this.expect(']');
        expr = {
          type: 'IndexAccessExpression',
          line: expr.line,
          object: expr,
          index,
        } as IndexAccessNode;
        continue;
      }

      // Function or method call e.g. invertTree(root) or q.push(root)
      if (this.peek().value === '(') {
        if (expr.type === 'Identifier') {
          this.advance();
          const args: BaseASTNode[] = [];
          while (this.peek().type !== 'EOF' && this.peek().value !== ')') {
            args.push(this.parseExpression());
            if (this.peek().value === ',') this.advance();
          }
          this.expect(')');
          expr = {
            type: 'CallExpression',
            line: expr.line,
            callee: (expr as IdentifierNode).name,
            args,
          } as CallExpressionNode;
          continue;
        } else if (expr.type === 'MemberAccessExpression') {
          this.advance();
          const args: BaseASTNode[] = [];
          while (this.peek().type !== 'EOF' && this.peek().value !== ')') {
            args.push(this.parseExpression());
            if (this.peek().value === ',') this.advance();
          }
          this.expect(')');
          const mem = expr as MemberAccessNode;
          expr = {
            type: 'MemberCallExpression',
            line: expr.line,
            object: mem.object,
            method: mem.property,
            args,
          } as MemberCallExpressionNode;
          continue;
        }
      }

      break;
    }

    return expr;
  }
}
