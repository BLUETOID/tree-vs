/**
 * Pure C++ Algorithm & Data Structure Presets Catalog
 */

export interface PresetProgram {
  id: string;
  name: string;
  category: string;
  description: string;
  explanation: string;
  code: string;
}

export const PRESET_PROGRAMS: PresetProgram[] = [
  // ------------------------------------------------------------------------
  // 1. Binary Search Tree (BST)
  // ------------------------------------------------------------------------
  {
    id: 'bst-insert',
    name: '1. Insert into BST (LC 701)',
    category: 'Binary Search Tree',
    description: 'Inserts nodes into a Binary Search Tree maintaining left < root < right.',
    explanation: 'Compares each value: if smaller, traverses left; if larger, traverses right, allocating a new node at the null boundary.',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

TreeNode* insert(TreeNode* root, int val) {
    if (root == nullptr) {
        TreeNode* node = new TreeNode(val);
        return node;
    }
    if (val < root->val) {
        root->left = insert(root->left, val);
    } else {
        root->right = insert(root->right, val);
    }
    return root;
}

int main() {
    TreeNode* root = nullptr;
    root = insert(root, 20);
    root = insert(root, 10);
    root = insert(root, 30);
    root = insert(root, 5);
    root = insert(root, 15);
    root = insert(root, 25);
    root = insert(root, 35);
}
`,
  },
  {
    id: 'bst-search',
    name: '2. Search in BST (LC 700)',
    category: 'Binary Search Tree',
    description: 'Searches for a key in a BST in logarithmic O(h) time.',
    explanation: 'Discards the non-matching half of the search tree at every recursive step.',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

TreeNode* search(TreeNode* root, int target) {
    if (root == nullptr || root->val == target) {
        return root;
    }
    if (target < root->val) {
        return search(root->left, target);
    }
    return search(root->right, target);
}

int main() {
    TreeNode* root = new TreeNode(25);
    root->left = new TreeNode(15);
    root->right = new TreeNode(35);
    root->left->left = new TreeNode(10);
    root->left->right = new TreeNode(20);

    TreeNode* res = search(root, 20);
}
`,
  },
  {
    id: 'bst-delete',
    name: '3. Delete Node in BST (LC 450)',
    category: 'Binary Search Tree',
    description: 'Deletes a node with 2 children using its in-order successor.',
    explanation: 'Finds the minimum value in the right subtree (in-order successor) to replace the deleted node value.',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

TreeNode* findMin(TreeNode* node) {
    while (node->left != nullptr) {
        node = node->left;
    }
    return node;
}

TreeNode* deleteNode(TreeNode* root, int key) {
    if (root == nullptr) return nullptr;
    if (key < root->val) {
        root->left = deleteNode(root->left, key);
    } else if (key > root->val) {
        root->right = deleteNode(root->right, key);
    } else {
        if (root->left == nullptr) return root->right;
        if (root->right == nullptr) return root->left;
        TreeNode* successor = findMin(root->right);
        root->val = successor->val;
        root->right = deleteNode(root->right, successor->val);
    }
    return root;
}

int main() {
    TreeNode* root = new TreeNode(50);
    root->left = new TreeNode(30);
    root->right = new TreeNode(70);
    root->left->left = new TreeNode(20);
    root->left->right = new TreeNode(40);
    root->right->left = new TreeNode(60);
    root->right->right = new TreeNode(80);

    root = deleteNode(root, 30);
}
`,
  },
  {
    id: 'tree-invert',
    name: '4. Invert / Mirror Binary Tree (LC 226)',
    category: 'Binary Search Tree',
    description: 'Recursively mirrors left and right subtrees of a binary tree.',
    explanation: 'Swaps left and right pointer links at each node and descends to subtrees.',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

TreeNode* invertTree(TreeNode* root) {
    if (root == nullptr) return nullptr;
    TreeNode* temp = root->left;
    root->left = root->right;
    root->right = temp;

    invertTree(root->left);
    invertTree(root->right);
    return root;
}

int main() {
    TreeNode* root = new TreeNode(4);
    root->left = new TreeNode(2);
    root->right = new TreeNode(7);
    root->left->left = new TreeNode(1);
    root->left->right = new TreeNode(3);
    root->right->left = new TreeNode(6);
    root->right->right = new TreeNode(9);

    invertTree(root);
}
`,
  },
  {
    id: 'max-depth',
    name: '5. Maximum Depth of Binary Tree (LC 104)',
    category: 'Binary Search Tree',
    description: 'Finds the number of nodes along the longest path from root to leaf.',
    explanation: 'Uses post-order recursion: maxDepth = 1 + max(leftDepth, rightDepth).',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

int maxDepth(TreeNode* root) {
    if (root == nullptr) return 0;
    int leftH = maxDepth(root->left);
    int rightH = maxDepth(root->right);
    return 1 + max(leftH, rightH);
}

int main() {
    TreeNode* root = new TreeNode(3);
    root->left = new TreeNode(9);
    root->right = new TreeNode(20);
    root->right->left = new TreeNode(15);
    root->right->right = new TreeNode(7);

    int depth = maxDepth(root);
    cout << "Max Depth: " << depth << endl;
}
`,
  },

  // ------------------------------------------------------------------------
  // 2. AVL Trees (Self-Balancing Rotations)
  // ------------------------------------------------------------------------
  {
    id: 'avl-ll-rotation',
    name: '6. AVL Left-Left (LL) Right Rotation',
    category: 'AVL Tree (Self-Balancing)',
    description: 'Demonstrates a single Right Rotation to fix a Left-Left imbalance.',
    explanation: 'When node has balance factor +2, a right rotation elevates left child to root.',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

TreeNode* rotateRight(TreeNode* y) {
    TreeNode* x = y->left;
    TreeNode* T2 = x->right;

    x->right = y;
    y->left = T2;
    return x;
}

int main() {
    // Left-Left imbalance: 30 -> 20 -> 10
    TreeNode* root = new TreeNode(30);
    root->left = new TreeNode(20);
    root->left->left = new TreeNode(10);

    // Perform LL Right Rotation: 20 becomes new root
    root = rotateRight(root);
}
`,
  },
  {
    id: 'avl-lr-rotation',
    name: '7. AVL Left-Right (LR) Double Rotation',
    category: 'AVL Tree (Self-Balancing)',
    description: 'Demonstrates double rotation: Left rotate left child, then Right rotate root.',
    explanation: 'Transforms a zig-zag imbalance into a straight left-left imbalance, then balances.',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

TreeNode* rotateLeft(TreeNode* x) {
    TreeNode* y = x->right;
    TreeNode* T2 = y->left;
    y->left = x;
    x->right = T2;
    return y;
}

TreeNode* rotateRight(TreeNode* y) {
    TreeNode* x = y->left;
    TreeNode* T2 = x->right;
    x->right = y;
    y->left = T2;
    return x;
}

TreeNode* rotateLeftRight(TreeNode* root) {
    root->left = rotateLeft(root->left);
    return rotateRight(root);
}

int main() {
    // Left-Right imbalance: 30 -> 10 -> 20
    TreeNode* root = new TreeNode(30);
    root->left = new TreeNode(10);
    root->left->right = new TreeNode(20);

    root = rotateLeftRight(root);
}
`,
  },

  // ------------------------------------------------------------------------
  // 3. Tree Traversals
  // ------------------------------------------------------------------------
  {
    id: 'inorder-traversal',
    name: '8. In-Order Traversal (Sorted Output)',
    category: 'Tree Traversals',
    description: 'Traverses Left -> Root -> Right, printing keys in ascending sorted order.',
    explanation: 'Standard recursive traversal demonstrating the call stack descent and unwinding.',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

void inorder(TreeNode* root) {
    if (root == nullptr) return;
    inorder(root->left);
    cout << root->val << " ";
    inorder(root->right);
}

int main() {
    TreeNode* root = new TreeNode(4);
    root->left = new TreeNode(2);
    root->right = new TreeNode(6);
    root->left->left = new TreeNode(1);
    root->left->right = new TreeNode(3);
    root->right->left = new TreeNode(5);
    root->right->right = new TreeNode(7);

    inorder(root);
}
`,
  },
  {
    id: 'level-order-bfs',
    name: '9. Level-Order BFS (LC 102)',
    category: 'Tree Traversals',
    description: 'Explores the binary tree level-by-level using a FIFO queue.',
    explanation: 'Pops front node from queue, prints its value, and pushes left and right children.',
    code: `#include <iostream>
#include <queue>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

void levelOrder(TreeNode* root) {
    if (root == nullptr) return;
    queue<TreeNode*> q;
    q.push(root);

    while (!q.empty()) {
        TreeNode* curr = q.front();
        q.pop();
        cout << curr->val << " ";
        if (curr->left != nullptr) q.push(curr->left);
        if (curr->right != nullptr) q.push(curr->right);
    }
}

int main() {
    TreeNode* root = new TreeNode(1);
    root->left = new TreeNode(2);
    root->right = new TreeNode(3);
    root->left->left = new TreeNode(4);
    root->left->right = new TreeNode(5);
    root->right->right = new TreeNode(6);

    levelOrder(root);
}
`,
  },
];
