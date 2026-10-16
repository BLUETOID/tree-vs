/**
 * C++ Lexer for Tree & Graph Visualizer
 */

import type { Token, TokenType } from '../../types/interpreter';

const KEYWORDS = new Set([
  'int',
  'void',
  'bool',
  'string',
  'auto',
  'struct',
  'class',
  'if',
  'else',
  'while',
  'for',
  'return',
  'new',
  'delete',
  'nullptr',
  'NULL',
  'true',
  'false',
  'vector',
  'queue',
  'stack',
  'priority_queue',
  'cout',
  'cin',
  'endl',
  'using',
  'namespace',
  'include',
  'TreeNode',
  'Node',
]);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let line = 1;
  let col = 1;
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    // Newline
    if (ch === '\n') {
      line++;
      col = 1;
      i++;
      continue;
    }

    // Whitespace
    if (/\s/.test(ch)) {
      col++;
      i++;
      continue;
    }

    // Line comment
    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Block comment
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
        i++;
      }
      i += 2;
      continue;
    }

    // Preprocessor directive e.g. #include <iostream>
    if (ch === '#') {
      while (i < source.length && source[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Numbers
    if (/\d/.test(ch)) {
      const startCol = col;
      let numStr = '';
      while (i < source.length && /[\d.]/.test(source[i])) {
        numStr += source[i];
        i++;
        col++;
      }
      tokens.push({ type: 'NUMBER', value: numStr, line, col: startCol });
      continue;
    }

    // String literals
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startCol = col;
      let strVal = '';
      i++;
      col++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < source.length) {
          strVal += source[i + 1];
          i += 2;
          col += 2;
        } else {
          strVal += source[i];
          i++;
          col++;
        }
      }
      if (i < source.length && source[i] === quote) {
        i++;
        col++;
      }
      tokens.push({ type: 'STRING', value: strVal, line, col: startCol });
      continue;
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_]/.test(ch)) {
      const startCol = col;
      let idStr = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
        idStr += source[i];
        i++;
        col++;
      }
      const tokenType: TokenType = KEYWORDS.has(idStr) ? 'KEYWORD' : 'IDENTIFIER';
      tokens.push({ type: tokenType, value: idStr, line, col: startCol });
      continue;
    }

    // Two-character operators
    const twoChars = source.slice(i, i + 2);
    if (['->', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '<<', '>>', '::'].includes(twoChars)) {
      tokens.push({ type: 'OPERATOR', value: twoChars, line, col });
      i += 2;
      col += 2;
      continue;
    }

    // Single-character operators & punctuation
    if (['+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~'].includes(ch)) {
      tokens.push({ type: 'OPERATOR', value: ch, line, col });
      i++;
      col++;
      continue;
    }

    if (['(', ')', '{', '}', '[', ']', ';', ',', '.', '?', ':'].includes(ch)) {
      tokens.push({ type: 'PUNCTUATION', value: ch, line, col });
      i++;
      col++;
      continue;
    }

    // Other unexpected character
    i++;
    col++;
  }

  tokens.push({ type: 'EOF', value: '', line, col });
  return tokens;
}
