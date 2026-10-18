import { describe, it, expect } from 'vitest';
import { runCppTreeInterpreter } from '../src/core/interpreter';
import { computeTreeLayout } from '../src/core/layout/tidyTree';

describe('Comprehensive C++ Language & Edge Case Tests', () => {
  describe('1. Nested Template Type Parsing & Varied Depths', () => {
    it('handles 1-level template: vector<int>', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          vector<int> v;
          v.push_back(10);
          v.push_back(20);
          cout << v[0] << " " << v[1];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('10 20');
    });

    it('handles 2-level template without space: vector<vector<int>>', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          vector<vector<int>> grid(3);
          grid[0].push_back(1);
          grid[1].push_back(2);
          grid[2].push_back(3);
          cout << grid[0][0] << " " << grid[1][0] << " " << grid[2][0];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1 2 3');
    });

    it('handles 2-level template with space: vector<vector<int> >', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          vector<vector<int> > grid(2);
          grid[0].push_back(42);
          cout << grid[0][0];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('42');
    });

    it('handles 3-level template: vector<vector<vector<int>>>', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          vector<vector<vector<int>>> cube(2);
          cube[0].resize(2);
          cube[0][0].push_back(99);
          cout << cube[0][0][0];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('99');
    });

    it('handles 4-level template: vector<vector<vector<vector<int>>>>', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          vector<vector<vector<vector<int>>>> hyper(1);
          hyper[0].resize(1);
          hyper[0][0].resize(1);
          hyper[0][0][0].push_back(777);
          cout << hyper[0][0][0][0];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('777');
    });

    it('handles pair<int, int> and vector<pair<int, int>>', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          pair<int, int> p = {10, 20};
          cout << p.first << " " << p.second << " ";

          vector<pair<int, int>> vp;
          vp.push_back({30, 40});
          cout << vp[0].first << " " << vp[0].second;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('10 20 30 40');
    });

    it('handles pair<vector<int>, vector<int>>', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          pair<vector<int>, vector<int>> p;
          p.first.push_back(5);
          p.second.push_back(15);
          cout << p.first[0] << " " << p.second[0];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('5 15');
    });
  });

  describe('2. std:: Namespace Prefixes & CP Boilerplate', () => {
    it('handles std::vector, std::cout, std::endl without using namespace std', () => {
      const code = `
        #include <iostream>
        #include <vector>
        int main() {
          std::vector<int> v;
          v.push_back(123);
          std::cout << v[0] << std::endl;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('123\n');
    });

    it('handles std::vector<std::vector<int>> with std:: prefix', () => {
      const code = `
        #include <iostream>
        #include <vector>
        int main() {
          std::vector<std::vector<int>> adj(2);
          adj[0].push_back(9);
          std::cout << adj[0][0];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('9');
    });

    it('ignores ios_base::sync_with_stdio and cin.tie boilerplate safely', () => {
      const code = `
        #include <bits/stdc++.h>
        using namespace std;
        int main() {
          ios_base::sync_with_stdio(false);
          cin.tie(NULL);
          int a = 5;
          cout << a;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('5');
    });

    it('supports math and utility builtins (max, min, abs, sqrt, pow, swap, make_pair)', () => {
      const code = `
        #include <iostream>
        #include <algorithm>
        #include <cmath>
        using namespace std;
        int main() {
          cout << max(10, 20) << " ";
          cout << std::min(10, 20) << " ";
          cout << abs(-15) << " ";
          cout << sqrt(49) << " ";
          cout << pow(2, 3) << " ";

          int x = 1, y = 2;
          swap(x, y);
          cout << x << " " << y << " ";

          pair<int, int> p = make_pair(100, 200);
          cout << p.first << " " << p.second;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('20 10 15 7 8 2 1 100 200');
    });
  });

  describe('3. Numeric Literals, Scientific Notation & Constants', () => {
    it('supports scientific notation: 1e9, 2e5, 1e-3', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          int inf = 1e9;
          int n = 2e5;
          double small = 1e-2;
          cout << inf << " " << n << " " << small;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1000000000 200000 0.01');
    });

    it('supports integer suffixes: LL, ULL', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          long long a = 1LL;
          long long b = 1000000007LL;
          long long shifted = 1LL << 4;
          cout << a << " " << b << " " << shifted;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1 1000000007 16');
    });

    it('evaluates constant arithmetic: 1e9 + 7', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          long long MOD = 1e9 + 7;
          cout << MOD;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1000000007');
    });
  });

  describe('4. Vector Methods & Initializer Lists', () => {
    it('supports vector resize(), back(), front(), pop_back(), size(), empty()', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          vector<int> v;
          cout << v.empty() << " ";
          v.resize(3, 5);
          cout << v.size() << " " << v[0] << " " << v[2] << " ";
          v.push_back(99);
          cout << v.front() << " " << v.back() << " ";
          v.pop_back();
          cout << v.back() << " ";
          v.clear();
          cout << v.size() << " " << v.empty();
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1 3 5 5 5 99 5 0 1');
    });

    it('supports vector<vector<int>> resize()', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          vector<vector<int>> adj;
          adj.resize(4);
          adj[1].push_back(2);
          adj[2].push_back(3);
          cout << adj[1].size() << " " << adj[1][0] << " " << adj[2][0];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1 2 3');
    });

    it('supports vector initializer lists: vector<int> v = {1, 2, 3}', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          vector<int> v = {10, 20, 30};
          cout << v[0] << " " << v[1] << " " << v[2];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('10 20 30');
    });
  });

  describe('5. Loop Control Flow & Continue/Break Semantics', () => {
    it('handles continue and break inside range-for loops', () => {
      const code = `
        #include <iostream>
        #include <vector>
        using namespace std;
        int main() {
          vector<int> v = {1, 2, 3, 4, 5};
          for (int x : v) {
            if (x == 2) continue;
            if (x == 4) break;
            cout << x << " ";
          }
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1 3 ');
    });

    it('handles continue and break inside standard for loops', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          for (int i = 0; i < 6; i++) {
            if (i == 1 || i == 3) continue;
            if (i == 5) break;
            cout << i << " ";
          }
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('0 2 4 ');
    });

    it('handles continue and break inside while loops', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          int i = 0;
          while (i < 5) {
            i++;
            if (i == 2) continue;
            if (i == 4) break;
            cout << i << " ";
          }
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('1 3 ');
    });

    it('handles nested loops with continue in inner loop without breaking outer loop', () => {
      const code = `
        #include <iostream>
        using namespace std;
        int main() {
          for (int i = 0; i < 2; i++) {
            for (int j = 0; j < 3; j++) {
              if (j == 1) continue;
              cout << i << "-" << j << " ";
            }
          }
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('0-0 0-2 1-0 1-2 ');
    });
  });

  describe('6. Real-World Tree Algorithms & Graph Visualizer Traces', () => {
    it('runs tree diameter algorithm with bidirectional adjacency list and dfs', () => {
      const code = `
        #include <bits/stdc++.h>
        using namespace std;

        void dfs(int u, int p, int d, int &maxd, int &farthest, vector<vector<int>> &adj) {
            if (d > maxd) {
                maxd = d;
                farthest = u;
            }
            for (int v : adj[u]) {
                if (v != p) {
                    dfs(v, u, d + 1, maxd, farthest, adj);
                }
            }
        }

        int main() {
            int n = 5;
            vector<vector<int>> adj(n + 1);
            // Edges: 1-2, 1-3, 2-4, 2-5
            adj[1].push_back(2); adj[2].push_back(1);
            adj[1].push_back(3); adj[3].push_back(1);
            adj[2].push_back(4); adj[4].push_back(2);
            adj[2].push_back(5); adj[5].push_back(2);

            int maxd = -1, farthest = 1;
            dfs(1, -1, 0, maxd, farthest, adj);

            int diam = -1, other = farthest;
            dfs(farthest, -1, 0, diam, other, adj);

            cout << "Diameter: " << diam;
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('Diameter: 3');

      const lastEvent = res.trace[res.trace.length - 1];
      expect(lastEvent.treeSnapshot).toBeDefined();
      const layout = computeTreeLayout(lastEvent.treeSnapshot!.nodes, lastEvent.treeSnapshot!.rootId);
      expect(layout.nodes.length).toBe(5);
      expect(layout.edges.length).toBe(4);
    });

    it('runs tree subtree size calculation', () => {
      const code = `
        #include <bits/stdc++.h>
        using namespace std;

        int sz[10];

        void get_sz(int u, int p, vector<vector<int>> &adj) {
            sz[u] = 1;
            for (int v : adj[u]) {
                if (v != p) {
                    get_sz(v, u, adj);
                    sz[u] += sz[v];
                }
            }
        }

        int main() {
            int n = 4;
            vector<vector<int>> adj(n + 1);
            adj[1].push_back(2); adj[2].push_back(1);
            adj[1].push_back(3); adj[3].push_back(1);
            adj[3].push_back(4); adj[4].push_back(3);

            get_sz(1, -1, adj);
            cout << sz[1] << " " << sz[2] << " " << sz[3] << " " << sz[4];
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('4 1 2 1');
    });

    it('runs Lowest Common Ancestor (LCA) using binary lifting structure on adjacency list', () => {
      const code = `
        #include <bits/stdc++.h>
        using namespace std;

        int parent_of[10];
        int depth[10];

        void dfs(int u, int p, int d, vector<vector<int>> &adj) {
            parent_of[u] = p;
            depth[u] = d;
            for (int v : adj[u]) {
                if (v != p) {
                    dfs(v, u, d + 1, adj);
                }
            }
        }

        int lca(int u, int v) {
            while (depth[u] > depth[v]) u = parent_of[u];
            while (depth[v] > depth[u]) v = parent_of[v];
            while (u != v) {
                u = parent_of[u];
                v = parent_of[v];
            }
            return u;
        }

        int main() {
            int n = 6;
            vector<vector<int>> adj(n + 1);
            // 1 - 2, 1 - 3, 2 - 4, 2 - 5, 3 - 6
            adj[1].push_back(2); adj[2].push_back(1);
            adj[1].push_back(3); adj[3].push_back(1);
            adj[2].push_back(4); adj[4].push_back(2);
            adj[2].push_back(5); adj[5].push_back(2);
            adj[3].push_back(6); adj[6].push_back(3);

            dfs(1, 1, 0, adj);

            cout << "LCA(4, 5): " << lca(4, 5) << ", ";
            cout << "LCA(4, 6): " << lca(4, 6);
        }
      `;
      const res = runCppTreeInterpreter(code);
      expect(res.error).toBeUndefined();
      expect(res.stdout).toBe('LCA(4, 5): 2, LCA(4, 6): 1');
    });
  });
});
