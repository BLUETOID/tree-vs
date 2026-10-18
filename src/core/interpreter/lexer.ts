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
  'const',
  'static',
  'unsigned',
  'signed',
  'long',
  'char',
  'float',
  'double',
  'break',
  'continue',
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
      const commentLine = line;
      const commentCol = col;
      i += 2;
      col += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
        i++;
      }
      if (i >= source.length) {
        throw new Error(`Unterminated block comment starting at line ${commentLine}, col ${commentCol}`);
      }
      i += 2;
      col += 2;
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
      let dotCount = 0;
      while (i < source.length) {
        const curr = source[i];
        if (curr === '.') {
          dotCount++;
          if (dotCount > 1) {
            throw new Error(`Invalid numeric literal with multiple decimal points at line ${line}, col ${col}`);
          }
          numStr += curr;
          i++;
          col++;
        } else if (/\d/.test(curr)) {
          numStr += curr;
          i++;
          col++;
        } else if (curr === 'e' || curr === 'E') {
          numStr += curr;
          i++;
          col++;
          if (i < source.length && (source[i] === '+' || source[i] === '-')) {
            numStr += source[i];
            i++;
            col++;
          }
        } else {
          break;
        }
      }
      // Consume integer suffixes like LL, ULL, u, l
      while (i < source.length && /[uUlL]/.test(source[i])) {
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
      const startLine = line;
      let strVal = '';
      i++;
      col++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\n') {
          line++;
          col = 1;
        }
        if (source[i] === '\\' && i + 1 < source.length) {
          const esc = source[i + 1];
          if (esc === 'n') strVal += '\n';
          else if (esc === 't') strVal += '\t';
          else if (esc === 'r') strVal += '\r';
          else if (esc === '\\') strVal += '\\';
          else if (esc === '"') strVal += '"';
          else if (esc === "'") strVal += "'";
          else if (esc === '0') strVal += '\0';
          else strVal += esc;
          i += 2;
          col += 2;
        } else {
          strVal += source[i];
          i++;
          col++;
        }
      }
      if (i >= source.length || source[i] !== quote) {
        throw new Error(`Unterminated string literal starting at line ${startLine}, col ${startCol}`);
      }
      i++;
      col++;
      tokens.push({ type: 'STRING', value: strVal, line: startLine, col: startCol });
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
    if (
      [
        '->',
        '==',
        '!=',
        '<=',
        '>=',
        '&&',
        '||',
        '++',
        '--',
        '<<',
        '>>',
        '::',
        '+=',
        '-=',
        '*=',
        '/=',
        '%=',
      ].includes(twoChars)
    ) {
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
    throw new Error(`Unexpected character '${ch}' at line ${line}, col ${col}`);
  }

  tokens.push({ type: 'EOF', value: '', line, col });
  return tokens;
}
