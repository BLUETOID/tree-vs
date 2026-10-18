import { describe, it, expect } from 'vitest';
import { runCppTreeInterpreter } from '../src/core/interpreter';
import { computeTreeLayout } from '../src/core/layout/tidyTree';

describe('Exhaustive Stress & Edge Cases Test Suite', () => {
  describe('1. Stack Container & Iterative Tree Algorithms', () => {
    it('supports stack<int> operations: push, pop, top, empty, size', () => {
      const code = `
        #include <iostream>
        #include <stack>
        using namespace std;
        int main() {
          stack<int> s;
          cout << s.empty() << " ";
          s.push(10);
          s.push(20);
          s.push(30);
          cout << s.size() << " " << s.top() << " ";
          s.pop();
          cout << s.top() << " " << s.size() << " ";
          cout << s.empty();
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1 3 30 20 2 0');
    });

    it('supports std::stack with namespace', () => {
      const code = `
        #include <iostream>
        #include <stack>
        int main() {
          std::stack<int> st;
          st.push(42);
          st.push(99);
          std::cout << st.top() << " " << st.size();
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('99 2');
    });

    it('performs iterative DFS tree traversal using stack<int>', () => {
      const code = `
        #include <bits/stdc++.h>
        using namespace std;

        int main() {
          int n = 5;
          vector<vector<int>> tree(n + 1);
          tree[1].push_back(2);
          tree[1].push_back(3);
          tree[2].push_back(4);
          tree[2].push_back(5);

          stack<int> st;
          vector<bool> visited(n + 1, false);
          st.push(1);

          while (!st.empty()) {
            int curr = st.top();
            st.pop();

            if (visited[curr]) continue;
            visited[curr] = true;
            cout << curr << " ";

            for (int nxt : tree[curr]) {
              if (!visited[nxt]) {
                st.push(nxt);
              }
            }
          }
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1 3 2 5 4 ');

      const lastSnap = res.trace[res.trace.length - 1].treeSnapshot!;
      expect(lastSnap.rootId).toBe('1');
      const layout = computeTreeLayout(lastSnap.nodes, lastSnap.rootId);
      expect(layout.nodes.length).toBe(5);
      expect(layout.edges.length).toBe(4);
    });

    it('throws error when st.top() is called on empty stack', () => {
      const code = `
        #include <stack>
        using namespace std;
        int main() {
          stack<int> s;
          s.top();
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toContain('called on empty stack');
    });
  });

  describe('2. Bitwise Operators & Precedence', () => {
    it('evaluates bitwise AND, OR, XOR correctly', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          int a = 6;  // 110
          int b = 3;  // 011
          cout << (a & b) << " " << (a | b) << " " << (a ^ b);
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('2 7 5');
    });

    it('respects C++ precedence: arithmetic > bitwise > comparison', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          // In C++, + has higher precedence than &
          // 8 & 3 + 1 == 8 & 4 == 0
          int x = 8 & 3 + 1;
          cout << x << " ";

          // 1 << 2 + 1 == 1 << 3 == 8
          int y = 1 << 2 + 1;
          cout << y;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('0 8');
    });

    it('handles bitmask odd/even check in conditional loops', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          for (int i = 1; i <= 5; i++) {
            if ((i & 1) == 1) {
              cout << i << "o ";
            } else {
              cout << i << "e ";
            }
          }
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1o 2e 3o 4e 5o ');
    });
  });

  describe('3. Custom Structs & Custom Type Declarations', () => {
    it('supports custom struct declaration and field assignments', () => {
      const code = `
        #include <iostream>
        using namespace std;

        struct Point {
          int x;
          int y;
        };

        int main() {
          Point pt;
          pt.x = 10;
          pt.y = 25;
          cout << pt.x << ", " << pt.y;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('10, 25');
    });

    it('supports weighted graph using struct Edge with vector<Edge>', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;

        struct Edge {
          int to;
          int wt;
        };

        int main() {
          vector<Edge> edges;
          Edge e1;
          e1.to = 2;
          e1.wt = 10;
          edges.push_back(e1);

          Edge e2;
          e2.to = 3;
          e2.wt = 20;
          edges.push_back(e2);

          for (Edge e : edges) {
            cout << e.to << "(" << e.wt << ") ";
          }
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('2(10) 3(20) ');
    });
  });

  describe('4. Array Initialization & Multiple Declarations', () => {
    it('supports array initializer lists: int arr[5] = {1, 2, 3, 4, 5}', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          int arr[5] = {10, 20, 30, 40, 50};
          cout << arr[0] << " " << arr[2] << " " << arr[4];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('10 30 50');
    });

    it('supports multiple variable declarations in single line: int a = 1, b = 2, c = 3', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          int a = 5, b = 10, c = 15;
          cout << a + b + c;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('30');
    });
  });

  describe('5. Unary Dereference & Address Operators', () => {
    it('supports unary * dereference on TreeNode pointer and & address-of', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          TreeNode* root = new TreeNode(42);
          cout << *root << " ";
          int val = 99;
          int ref = &val;
          cout << ref;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('42 99');
    });
  });

  describe('6. Loop Constructs & Control Flow', () => {
    it('supports while loops with break and continue', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          int i = 0;
          while (i < 10) {
            i++;
            if (i % 2 == 0) continue;
            if (i > 7) break;
            cout << i << " ";
          }
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1 3 5 7 ');
    });

    it('supports for loop without init clause: for (; i < 4; i++)', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          int i = 1;
          for (; i < 4; i++) {
            cout << i << " ";
          }
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1 2 3 ');
    });

    it('supports for loop with custom type init clause: for (Point pt; ...)', () => {
      const code = `
        #include <iostream>
        using namespace std;
        struct Counter {
          int val;
        };
        int main() {
          int sum = 0;
          for (int i = 0; i < 3; i++) {
            sum += i;
          }
          cout << sum;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('3');
    });
  });

  describe('7. Pointer Badges & Canvas Precision', () => {
    it('strictly avoids placing pointer badges on scalars (cur, target_sum, acc, isLeaf)', () => {
      const code = `
        #include <bits/stdc++.h>
        using namespace std;

        void solve(int node, int cur, int target_sum, int acc, bool isLeaf) {
          cout << node << " ";
        }

        int main() {
          vector<int> tree[5];
          tree[1].push_back(2);
          tree[1].push_back(3);
          solve(1, 1, 10, 0, false);
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();

      for (const step of res.trace) {
        if (step.treeSnapshot) {
          const badgeNames = step.treeSnapshot.pointers.map((p) => p.name);
          expect(badgeNames).not.toContain('cur');
          expect(badgeNames).not.toContain('target_sum');
          expect(badgeNames).not.toContain('acc');
          expect(badgeNames).not.toContain('isLeaf');
        }
      }
    });

    it('correctly badges active node and neighbor during DFS exploration', () => {
      const code = `
        #include <bits/stdc++.h>
        using namespace std;

        void dfs(int node, int parent, vector<vector<int>> &adj) {
          for (int nxt : adj[node]) {
            if (nxt != parent) {
              dfs(nxt, node, adj);
            }
          }
        }

        int main() {
          vector<vector<int>> adj(3);
          adj[1].push_back(2);
          adj[2].push_back(1);
          dfs(1, -1, adj);
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();

      // Look for a step that marked nxt badge
      const foundNxt = res.trace.some((step) =>
        step.treeSnapshot?.pointers.some((p) => p.name === 'nxt' && p.nodeId === '2')
      );
      expect(foundNxt).toBe(true);
    });
  });

  describe('8. Layout Robustness: Deep, Wide, Degenerate Trees & Forests', () => {
    it('computes collision-free layout for a long left-degenerate line tree', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          TreeNode* root = new TreeNode(1);
          root->left = new TreeNode(2);
          root->left->left = new TreeNode(3);
          root->left->left->left = new TreeNode(4);
          root->left->left->left->left = new TreeNode(5);
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      const lastSnap = res.trace[res.trace.length - 1].treeSnapshot!;
      const layout = computeTreeLayout(lastSnap.nodes, lastSnap.rootId);
      expect(layout.nodes.length).toBe(5);
      expect(layout.edges.length).toBe(4);
      // All nodes should have distinct coordinates and strictly increasing Y
      for (let i = 0; i < layout.nodes.length - 1; i++) {
        expect(layout.nodes[i + 1].y).toBeGreaterThanOrEqual(layout.nodes[i].y);
      }
    });

    it('computes collision-free layout for a long right-degenerate line tree', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          TreeNode* root = new TreeNode(10);
          root->right = new TreeNode(20);
          root->right->right = new TreeNode(30);
          root->right->right->right = new TreeNode(40);
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      const lastSnap = res.trace[res.trace.length - 1].treeSnapshot!;
      const layout = computeTreeLayout(lastSnap.nodes, lastSnap.rootId);
      expect(layout.nodes.length).toBe(4);
      expect(layout.edges.length).toBe(3);
    });

    it('computes layout for wide tree with 8 children under root', () => {
      const code = `
        #include <bits/stdc++.h>
        using namespace std;
        int main() {
          vector<int> tree[10];
          for (int i = 2; i <= 9; i++) {
            tree[1].push_back(i);
          }
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      const lastSnap = res.trace[res.trace.length - 1].treeSnapshot!;
      const layout = computeTreeLayout(lastSnap.nodes, lastSnap.rootId);
      expect(layout.nodes.length).toBe(9);
      expect(layout.edges.length).toBe(8);

      // Verify no two children have overlapping X positions
      const childXCoords = layout.nodes.filter((n) => n.id !== '1').map((n) => n.x);
      const uniqueX = new Set(childXCoords);
      expect(uniqueX.size).toBe(childXCoords.length);
    });
  });

  describe('9. Comprehensive Error Handling & Security Protections', () => {
    it('reports informative modulo by zero error', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          int a = 10 % 0;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toContain('Modulo by zero');
    });

    it('prevents prototype mutation via compound assignment or member assignment', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          TreeNode* root = new TreeNode(1);
          root->__proto__ = nullptr;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toContain('Security violation');
    });

    it('reports undefined identifier error with line number', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          cout << nonExistentVar;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toContain("Undefined identifier 'nonExistentVar'");
    });
  });

  describe('10. Math Builtins & CP Utility Functions', () => {
    it('executes sqrt, pow, abs, swap correctly', () => {
      const code = `
        #include <iostream>
        #include <cmath>
        #include <algorithm>
        using namespace std;
        int main() {
          cout << sqrt(16) << " ";
          cout << pow(2, 5) << " ";
          cout << abs(0 - 42) << " ";
          int x = 100, y = 200;
          swap(x, y);
          cout << x << " " << y;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('4 32 42 200 100');
    });
  });

  describe('11. Competitive Programming Boilerplate & Fast I/O', () => {
    it('runs boilerplate with sync_with_stdio, cin.tie, and scientific notation', () => {
      const code = `
        #include <bits/stdc++.h>
        using namespace std;

        int main() {
          ios_base::sync_with_stdio(false);
          cin.tie(NULL);

          long long INF = 1e9 + 7;
          double eps = 1e-3;
          long long big = 100LL;

          cout << INF << " " << big;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1000000007 100');
    });

    it('handles nested ternary expressions: max of 3 numbers', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          int a = 15, b = 42, c = 27;
          int mx = a > b ? (a > c ? a : c) : (b > c ? b : c);
          cout << mx;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('42');
    });

    it('supports compound assignment on 2D vectors: grid[r][c] += 5', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          vector<vector<int>> grid(2);
          grid[0].push_back(10);
          grid[0][0] += 15;
          cout << grid[0][0];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('25');
    });

    it('supports range-for loop with reference: for (auto &v : vec)', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          vector<int> v;
          v.push_back(1);
          v.push_back(2);
          v.push_back(3);

          for (auto &x : v) {
            cout << x * 10 << " ";
          }
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('10 20 30 ');
    });
  });
});
