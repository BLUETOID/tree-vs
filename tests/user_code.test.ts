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
});
