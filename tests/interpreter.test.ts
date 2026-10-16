import { describe, it, expect } from 'vitest';
import { runCppTreeInterpreter } from '../src/core/interpreter';

describe('C++ Tree Interpreter Tests', () => {
  it('parses and executes C++ TreeNode allocation and pointer assignment', () => {
    const code = `
      struct TreeNode {
          int val;
          TreeNode* left;
          TreeNode* right;
      };

      int main() {
          TreeNode* root = new TreeNode(10);
          root->left = new TreeNode(5);
          root->right = new TreeNode(20);
          cout << root->val << " " << root->left->val;
      }
    `;

    const result = runCppTreeInterpreter(code);
    expect(result.error).toBeUndefined();
    expect(result.trace.length).toBeGreaterThan(3);
    expect(result.stdout).toBe('10 5');

    const lastTrace = result.trace[result.trace.length - 1];
    expect(lastTrace.treeSnapshot).toBeDefined();
    const nodes = lastTrace.treeSnapshot!.nodes;
    expect(Object.keys(nodes).length).toBe(3);
  });

  it('executes recursive tree function and tracks call stack frames', () => {
    const code = `
      struct TreeNode {
          int val;
          TreeNode* left;
          TreeNode* right;
      };

      int sum(TreeNode* root) {
          if (root == nullptr) return 0;
          return root->val + sum(root->left);
      }

      int main() {
          TreeNode* root = new TreeNode(4);
          root->left = new TreeNode(6);
          int res = sum(root);
      }
    `;

    const result = runCppTreeInterpreter(code);
    expect(result.error).toBeUndefined();
    expect(result.trace.length).toBeGreaterThan(4);
  });
});
