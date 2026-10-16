/**
 * Trie (Prefix Tree) Algorithms & Step Generators
 * Visualizes character transitions, prefix matching, and word endpoints.
 */

import type { TreeNodeData, TreeStepSnapshot } from '../../types/tree';

export interface TrieNodeInternal {
  id: string;
  char: string;
  isWordEnd: boolean;
  children: Record<string, TrieNodeInternal>;
}

export function buildTrieTree(words: string[]): {
  nodes: Record<string, TreeNodeData>;
  rootId: string;
} {
  const root: TrieNodeInternal = {
    id: 't_root',
    char: '*',
    isWordEnd: false,
    children: {},
  };

  let counter = 1;

  for (const word of words) {
    let curr = root;
    for (const ch of word.toLowerCase()) {
      if (!curr.children[ch]) {
        curr.children[ch] = {
          id: `t_${counter++}`,
          char: ch,
          isWordEnd: false,
          children: {},
        };
      }
      curr = curr.children[ch];
    }
    curr.isWordEnd = true;
  }

  // Convert Trie hierarchy to flat TreeNodeData
  const nodes: Record<string, TreeNodeData> = {};

  function traverse(n: TrieNodeInternal, parentId: string | null) {
    const childKeys = Object.keys(n.children).sort();
    const leftId = childKeys[0] ? n.children[childKeys[0]].id : null;
    const rightId = childKeys[1] ? n.children[childKeys[1]].id : null;

    nodes[n.id] = {
      id: n.id,
      val: n.char === '*' ? 'ROOT' : n.char,
      left: leftId,
      right: rightId,
      parent: parentId,
      isWordEnd: n.isWordEnd,
      state: 'default',
    };

    for (const key of childKeys) {
      traverse(n.children[key], n.id);
    }
  }

  traverse(root, null);
  return { nodes, rootId: 't_root' };
}

export function generateTrieSearchSteps(
  words: string[],
  query: string,
  isPrefixSearch: boolean = false
): TreeStepSnapshot[] {
  const steps: TreeStepSnapshot[] = [];
  const { nodes, rootId } = buildTrieTree(words);
  let stepCounter = 0;

  const currentNodes = { ...nodes };

  steps.push({
    stepIndex: stepCounter++,
    nodes: { ...currentNodes },
    rootId,
    pointers: [{ name: 'query', nodeId: rootId, color: '#38bdf8' }],
    action: `${isPrefixSearch ? 'Prefix Check' : 'Word Search'}: "${query}"`,
    explanation: `Starting at root. Searching character-by-character for "${query}".`,
    auxiliary: {},
  });

  let currId = rootId;
  let matchedChars = '';

  for (let i = 0; i < query.length; i++) {
    const ch = query[i].toLowerCase();
    matchedChars += ch;

    // Find child node with value ch
    const childIds = Object.keys(currentNodes).filter(
      (id) => currentNodes[id].parent === currId && currentNodes[id].val === ch
    );

    if (childIds.length === 0) {
      // Character not found
      steps.push({
        stepIndex: stepCounter++,
        nodes: { ...currentNodes },
        rootId,
        pointers: [{ name: 'miss', nodeId: currId, color: '#f43f5e' }],
        action: `Character '${ch}' Not Found!`,
        explanation: `No branch from node '${currentNodes[currId].val}' with character '${ch}'. "${query}" does not exist in Trie.`,
        auxiliary: {},
      });
      return steps;
    }

    const nextId = childIds[0];
    currentNodes[nextId] = { ...currentNodes[nextId], state: 'comparing' };

    steps.push({
      stepIndex: stepCounter++,
      nodes: { ...currentNodes },
      rootId,
      pointers: [{ name: 'match', nodeId: nextId, color: '#38bdf8' }],
      action: `Matched Character '${ch}' (Prefix: "${matchedChars}")`,
      explanation: `Followed edge with character '${ch}' to node ${nextId}.`,
      auxiliary: {},
    });

    currentNodes[nextId] = { ...currentNodes[nextId], state: 'default' };
    currId = nextId;
  }

  // End of query string reached
  const finalNode = currentNodes[currId];
  if (isPrefixSearch || finalNode.isWordEnd) {
    currentNodes[currId] = { ...currentNodes[currId], state: 'found' };
    steps.push({
      stepIndex: stepCounter++,
      nodes: { ...currentNodes },
      rootId,
      pointers: [{ name: 'found', nodeId: currId, color: '#10b981' }],
      action: `Match Found! "${query}"`,
      explanation: isPrefixSearch
        ? `"${query}" is a valid prefix in the dictionary.`
        : `"${query}" is a complete valid word in the dictionary (isWordEnd = true).`,
      auxiliary: {},
    });
  } else {
    currentNodes[currId] = { ...currentNodes[currId], state: 'active' };
    steps.push({
      stepIndex: stepCounter++,
      nodes: { ...currentNodes },
      rootId,
      pointers: [{ name: 'prefix_only', nodeId: currId, color: '#f59e0b' }],
      action: `Prefix exists, but NOT a complete word`,
      explanation: `All characters matched, but node is not marked as word end (isWordEnd = false).`,
      auxiliary: {},
    });
  }

  return steps;
}
