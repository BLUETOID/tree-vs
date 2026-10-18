import { describe, it, expect } from 'vitest';
import { runCppTreeInterpreter } from '../src/core/interpreter';
import { computeTreeLayout } from '../src/core/layout/tidyTree';

describe('User code test', () => {
  it('runs user dfs code', () => {
    const code = `#include <bits/stdc++.h>
using namespace std;

const int maxx = 100005;
vector <int> tree[maxx];

void dfs(int node) {
    cout << node << " ";
    for (auto i: tree[node]) {
        dfs(i);
    }
}

int main() {
    int n;
    cin >> n;
    
    int u, v;
    for (int i = 0; i < n - 1; i++) {
        cin >> u >> v;
        tree[u].push_back(v);
    }
    
    // Start DFS from the root node
    dfs(1);
}`;

    const input = `4
1 2
1 3
2 4`;

    const result = runCppTreeInterpreter(code, input);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toBe('1 2 4 3 ');
    expect(result.trace.length).toBeGreaterThan(10);

    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.treeSnapshot).toBeDefined();
    expect(lastEvent.treeSnapshot!.rootId).toBe('1');
    const nodes = lastEvent.treeSnapshot!.nodes;
    expect(Object.keys(nodes)).toContain('1');
    expect(Object.keys(nodes)).toContain('2');
    const layout = computeTreeLayout(lastEvent.treeSnapshot!.nodes, lastEvent.treeSnapshot!.rootId);
    expect(layout.nodes.length).toBe(4);
    expect(layout.edges.length).toBe(3);
  });

  it('runs user dfs code with 5 nodes and irregular whitespace in stdin', () => {
    const code = `#include <bits/stdc++.h>
using namespace std;

const int maxx = 100005;
vector <int> tree[maxx];

void dfs(int node) {
    cout << node << " ";
    for (auto i: tree[node]) {
        dfs(i);
    }
}

int main() {
    int n;
    cin >> n;
    
    int u, v;
    for (int i = 0; i < n - 1; i++) {
        cin >> u >> v;
        tree[u].push_back(v);
    }
    
    dfs(1);
}`;

    const input = `  5   
1 2   1 3
2 4
2 5
`;

    const result = runCppTreeInterpreter(code, input);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toBe('1 2 4 5 3 ');

    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.treeSnapshot!.rootId).toBe('1');
    const layout = computeTreeLayout(lastEvent.treeSnapshot!.nodes, lastEvent.treeSnapshot!.rootId);
    expect(layout.nodes.length).toBe(5);
    expect(layout.edges.length).toBe(4);
  });

  it('runs user bfs code with queue and vector<bool> vis', () => {
    const code = `#include <bits/stdc++.h>

using namespace std;

int main() {
    int n;
    cin >> n;
    vector < int > tree[n + 1];
    for (int i = 1; i < n; i++) {
        int u, v;
        cin >> u >> v;
        tree[u].push_back(v);
    }
    queue < int > q;
    vector < bool > vis(n + 1, false);
    q.push(1);
    while (!q.empty()) {
        int curr = q.front();
        cout << curr << " ";

        vis[curr] = true;
        q.pop();

        for (auto neighbour: tree[curr]) {
            if (!vis[neighbour]) {
                q.push(neighbour);
            }
        }
    }
}`;

    const input = `4
1 2
1 3
2 4`;

    const result = runCppTreeInterpreter(code, input);
    expect(result.error).toBeUndefined();
    expect(result.stdout.trim()).toBe('1 2 3 4');
    expect(result.trace.length).toBeGreaterThan(20);

    const hasQueueTrace = result.trace.some(
      (t) => t.treeSnapshot?.auxiliary?.queue && t.treeSnapshot.auxiliary.queue.length > 0
    );
    expect(hasQueueTrace).toBe(true);

    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.treeSnapshot).toBeDefined();
    expect(lastEvent.treeSnapshot!.rootId).toBe('1');
    const layout = computeTreeLayout(lastEvent.treeSnapshot!.nodes, lastEvent.treeSnapshot!.rootId);
    expect(layout.nodes.length).toBe(4);
    expect(layout.edges.length).toBe(3);
  });

  it('runs user bidirectional dfs code with &maxd reference', () => {
    const code = `#include <bits/stdc++.h>
using namespace std;
vector<int> adj[100002];
void dfs(int node, int parent, int d, int &maxd){
    maxd = max(d, maxd);
    for(int v: adj[node]){
        if(v != parent){
            dfs(v, node, d + 1, maxd);
        }
    }
}
int main() {
   int n;
   cin >> n;
   int depth = 0;
   for(int i = 1; i < n; i++){
       int u, v;
       cin >> u >> v;
       adj[u].push_back(v);
       adj[v].push_back(u);
   }
   dfs(1, -1, 0, depth);
   cout << depth;
}`;

    const input = `8
1 2
1 3
3 4
3 5
3 6
2 7 
2 8`;

    const result = runCppTreeInterpreter(code, input);
    expect(result.error).toBeUndefined();
    expect(result.stdout.trim()).toBe('2');
    for (const step of result.trace) {
      if (step.treeSnapshot) {
        computeTreeLayout(step.treeSnapshot.nodes, step.treeSnapshot.rootId);
      }
    }
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.treeSnapshot).toBeDefined();
    expect(lastEvent.treeSnapshot!.rootId).toBe('1');
    const layout = computeTreeLayout(lastEvent.treeSnapshot!.nodes, lastEvent.treeSnapshot!.rootId);
    expect(layout.nodes.length).toBe(8);
    expect(layout.edges.length).toBe(7);
  });
});


