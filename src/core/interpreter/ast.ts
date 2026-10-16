/**
 * C++ AST Definitions for Tree & Graph Visualizer
 */

export type ASTNodeType =
  | 'Program'
  | 'FunctionDeclaration'
  | 'StructDeclaration'
  | 'VariableDeclaration'
  | 'AssignmentStatement'
  | 'MemberAssignmentStatement'
  | 'IfStatement'
  | 'WhileStatement'
  | 'ReturnStatement'
  | 'ExpressionStatement'
  | 'BlockStatement'
  | 'EmptyStatement'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'CallExpression'
  | 'MemberCallExpression'
  | 'MemberAccessExpression'
  | 'ConditionalExpression'
  | 'NewExpression'
  | 'Identifier'
  | 'Literal';

export interface BaseASTNode {
  type: ASTNodeType;
  line: number;
}

export interface ProgramNode extends BaseASTNode {
  type: 'Program';
  body: BaseASTNode[];
}

export interface FunctionDeclNode extends BaseASTNode {
  type: 'FunctionDeclaration';
  returnType: string;
  name: string;
  params: { type: string; name: string }[];
  body: BlockStatementNode;
}

export interface StructDeclNode extends BaseASTNode {
  type: 'StructDeclaration';
  name: string;
  members: { type: string; name: string }[];
}

export interface VariableDeclNode extends BaseASTNode {
  type: 'VariableDeclaration';
  varType: string;
  name: string;
  initializer?: BaseASTNode;
}

export interface AssignmentNode extends BaseASTNode {
  type: 'AssignmentStatement';
  target: string;
  value: BaseASTNode;
}

export interface MemberAssignmentNode extends BaseASTNode {
  type: 'MemberAssignmentStatement';
  object: BaseASTNode;
  property: string;
  value: BaseASTNode;
}

export interface IfStatementNode extends BaseASTNode {
  type: 'IfStatement';
  condition: BaseASTNode;
  consequent: BaseASTNode;
  alternate?: BaseASTNode;
}

export interface WhileStatementNode extends BaseASTNode {
  type: 'WhileStatement';
  condition: BaseASTNode;
  body: BaseASTNode;
}

export interface ReturnStatementNode extends BaseASTNode {
  type: 'ReturnStatement';
  argument?: BaseASTNode;
}

export interface BlockStatementNode extends BaseASTNode {
  type: 'BlockStatement';
  body: BaseASTNode[];
}

export interface EmptyStatementNode extends BaseASTNode {
  type: 'EmptyStatement';
}

export interface ExpressionStatementNode extends BaseASTNode {
  type: 'ExpressionStatement';
  expression: BaseASTNode;
}

export interface BinaryExpressionNode extends BaseASTNode {
  type: 'BinaryExpression';
  operator: string;
  left: BaseASTNode;
  right: BaseASTNode;
}

export interface UnaryExpressionNode extends BaseASTNode {
  type: 'UnaryExpression';
  operator: string;
  argument: BaseASTNode;
}

export interface CallExpressionNode extends BaseASTNode {
  type: 'CallExpression';
  callee: string;
  args: BaseASTNode[];
}

export interface MemberCallExpressionNode extends BaseASTNode {
  type: 'MemberCallExpression';
  object: BaseASTNode;
  method: string;
  args: BaseASTNode[];
}

export interface MemberAccessNode extends BaseASTNode {
  type: 'MemberAccessExpression';
  object: BaseASTNode;
  property: string;
}

export interface ConditionalExpressionNode extends BaseASTNode {
  type: 'ConditionalExpression';
  condition: BaseASTNode;
  consequent: BaseASTNode;
  alternate: BaseASTNode;
}

export interface NewExpressionNode extends BaseASTNode {
  type: 'NewExpression';
  typeName: string;
  args: BaseASTNode[];
}

export interface IdentifierNode extends BaseASTNode {
  type: 'Identifier';
  name: string;
}

export interface LiteralNode extends BaseASTNode {
  type: 'Literal';
  value: any;
  raw: string;
}
