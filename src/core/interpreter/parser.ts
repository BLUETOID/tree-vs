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
  AssignmentNode,
  MemberAssignmentNode,
  IfStatementNode,
  WhileStatementNode,
  ReturnStatementNode,
  BlockStatementNode,
  ExpressionStatementNode,
  BinaryExpressionNode,
  CallExpressionNode,
  MemberAccessNode,
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
    let typeStr = this.advance().value;
    while (this.peek().value === '*' || this.peek().value === '&' || this.peek().value === '<') {
      if (this.peek().value === '<') {
        typeStr += this.advance().value;
        while (this.peek().type !== 'EOF' && this.peek().value !== '>') {
          typeStr += this.advance().value;
        }
        if (this.peek().value === '>') typeStr += this.advance().value;
      } else {
        typeStr += this.advance().value;
      }
    }
    return typeStr;
  }

  private parseFunctionOrVar(): BaseASTNode {
    const startLine = this.peek().line;
    const typeStr = this.parseTypeString();
    const name = this.advance().value;

    // Function declaration: type name ( ... ) { ... }
    if (this.peek().value === '(') {
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

    // Top-level variable declaration
    let initializer: BaseASTNode | undefined;
    if (this.match('=')) {
      initializer = this.parseExpression();
    }
    this.match(';');

    return {
      type: 'VariableDeclaration',
      line: startLine,
      varType: typeStr,
      name,
      initializer,
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

  public parseStatement(): BaseASTNode | null {
    const token = this.peek();

    if (token.value === ';') {
      this.advance();
      return null;
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

    if (token.value === 'return') {
      return this.parseReturn();
    }

    // Variable declaration or expression statement
    const next = this.peekNext();
    if (
      ['int', 'void', 'bool', 'string', 'auto', 'TreeNode', 'queue', 'vector', 'stack'].includes(
        token.value
      ) ||
      next.value === '*' ||
      (token.type === 'IDENTIFIER' && next.type === 'IDENTIFIER')
    ) {
      return this.parseVarDecl();
    }

    // Member assignment e.g. root->left = ...
    return this.parseAssignmentOrExpr();
  }

  private parseIf(): IfStatementNode {
    const token = this.advance(); // 'if'
    this.expect('(');
    const condition = this.parseExpression();
    this.expect(')');
    const consequent = this.peek().value === '{' ? this.parseBlock() : this.parseStatement()!;
    let alternate: BaseASTNode | undefined;
    if (this.match('else')) {
      alternate = this.peek().value === '{' ? this.parseBlock() : this.parseStatement()!;
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
    const body = this.peek().value === '{' ? this.parseBlock() : this.parseStatement()!;
    return {
      type: 'WhileStatement',
      line: token.line,
      condition,
      body,
    };
  }

  private parseReturn(): ReturnStatementNode {
    const token = this.advance(); // 'return'
    let argument: BaseASTNode | undefined;
    if (this.peek().value !== ';') {
      argument = this.parseExpression();
    }
    this.match(';');
    return {
      type: 'ReturnStatement',
      line: token.line,
      argument,
    };
  }

  private parseVarDecl(): VariableDeclNode {
    const startLine = this.peek().line;
    const typeStr = this.parseTypeString();
    const name = this.advance().value;
    let initializer: BaseASTNode | undefined;

    if (this.match('=')) {
      initializer = this.parseExpression();
    }
    this.match(';');

    return {
      type: 'VariableDeclaration',
      line: startLine,
      varType: typeStr,
      name,
      initializer,
    };
  }

  private parseAssignmentOrExpr(): BaseASTNode {
    const expr = this.parseExpression();

    if (this.match('=')) {
      const val = this.parseExpression();
      this.match(';');

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
      }
    }

    this.match(';');
    return {
      type: 'ExpressionStatement',
      line: expr.line,
      expression: expr,
    } as ExpressionStatementNode;
  }

  public parseExpression(): BaseASTNode {
    return this.parseBinary(0);
  }

  private parseBinary(minPrec: number): BaseASTNode {
    let left = this.parsePrimary();

    const precMap: Record<string, number> = {
      '||': 1,
      '&&': 2,
      '==': 3,
      '!=': 3,
      '<': 4,
      '>': 4,
      '<=': 4,
      '>=': 4,
      '+': 5,
      '-': 5,
      '*': 6,
      '/': 6,
      '<<': 7,
      '>>': 7,
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

      // Function call e.g. invertTree(root)
      if (this.peek().value === '(' && expr.type === 'Identifier') {
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
      }

      break;
    }

    return expr;
  }
}
