/**
 * C++ AST Definitions for Tree & Graph Visualizer
 */

export type ASTNodeType =
  | 'Program'
  | 'FunctionDeclaration'
  | 'StructDeclaration'
  | 'VariableDeclaration'
  | 'AssignmentStatement'
  | 'CompoundAssignmentStatement'
  | 'MemberAssignmentStatement'
  | 'IndexAssignmentStatement'
  | 'IfStatement'
  | 'WhileStatement'
  | 'ForStatement'
  | 'RangeForStatement'
  | 'BreakStatement'
  | 'ContinueStatement'
  | 'ReturnStatement'
  | 'ExpressionStatement'
  | 'BlockStatement'
  | 'EmptyStatement'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'UpdateExpression'
  | 'CallExpression'
  | 'MemberCallExpression'
  | 'MemberAccessExpression'
  | 'IndexAccessExpression'
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

export interface VariableDeclarator {
  name: string;
  isArray?: boolean;
  arraySize?: BaseASTNode;
  initializer?: BaseASTNode;
}

export interface VariableDeclNode extends BaseASTNode {
  type: 'VariableDeclaration';
  varType: string;
  name: string;
  initializer?: BaseASTNode;
  isArray?: boolean;
  arraySize?: BaseASTNode;
  declarations?: VariableDeclarator[];
}

export interface ForStatementNode extends BaseASTNode {
  type: 'ForStatement';
  init?: BaseASTNode;
  condition?: BaseASTNode;
  update?: BaseASTNode;
  body: BaseASTNode;
}

export interface RangeForStatementNode extends BaseASTNode {
  type: 'RangeForStatement';
  varType: string;
  varName: string;
  iterable: BaseASTNode;
  body: BaseASTNode;
}

export interface BreakStatementNode extends BaseASTNode {
  type: 'BreakStatement';
}

export interface ContinueStatementNode extends BaseASTNode {
  type: 'ContinueStatement';
}

export interface IndexAccessNode extends BaseASTNode {
  type: 'IndexAccessExpression';
  object: BaseASTNode;
  index: BaseASTNode;
}

export interface IndexAssignmentNode extends BaseASTNode {
  type: 'IndexAssignmentStatement';
  object: BaseASTNode;
  index: BaseASTNode;
  value: BaseASTNode;
}

export interface UpdateExpressionNode extends BaseASTNode {
  type: 'UpdateExpression';
  operator: '++' | '--';
  argument: BaseASTNode;
  prefix: boolean;
}

export interface CompoundAssignmentNode extends BaseASTNode {
  type: 'CompoundAssignmentStatement';
  target: BaseASTNode;
  operator: '+=' | '-=' | '*=' | '/=' | '%=';
  value: BaseASTNode;
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
