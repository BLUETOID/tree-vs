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

  // ------------------------------------------------------------------------
  // 4. LeetCode & Competitive Programming (Classic Algorithms)
  // ------------------------------------------------------------------------
  {
    id: 'validate-bst',
    name: '10. Validate Binary Search Tree (LC 98)',
    category: 'LeetCode & Competitive Programming',
    description: 'Validates that every subtree satisfies minVal < root->val < maxVal.',
    explanation: 'Uses strict range constraints: traverses left updating maxVal, and right updating minVal.',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

bool isValidBST(TreeNode* root, long minVal, long maxVal) {
    if (root == nullptr) return true;
    if (root->val <= minVal || root->val >= maxVal) return false;
    return isValidBST(root->left, minVal, root->val) && 
           isValidBST(root->right, root->val, maxVal);
}

int main() {
    TreeNode* root = new TreeNode(5);
    root->left = new TreeNode(1);
    root->right = new TreeNode(7);
    root->right->left = new TreeNode(6);
    root->right->right = new TreeNode(8);

    bool valid = isValidBST(root, -1000, 1000);
    if (valid) {
        cout << "Valid BST" << endl;
    } else {
        cout << "Invalid BST" << endl;
    }
}
`,
  },
  {
    id: 'lowest-common-ancestor',
    name: '11. Lowest Common Ancestor (LC 236)',
    category: 'LeetCode & Competitive Programming',
    description: 'Finds the lowest node in T that has both p and q as descendants.',
    explanation: 'Post-order divide and conquer: if left and right both return non-null, current node is the LCA split point.',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

TreeNode* lowestCommonAncestor(TreeNode* root, int p, int q) {
    if (root == nullptr || root->val == p || root->val == q) {
        return root;
    }
    TreeNode* left = lowestCommonAncestor(root->left, p, q);
    TreeNode* right = lowestCommonAncestor(root->right, p, q);

    if (left != nullptr && right != nullptr) return root;
    return (left != nullptr) ? left : right;
}

int main() {
    TreeNode* root = new TreeNode(3);
    root->left = new TreeNode(5);
    root->right = new TreeNode(1);
    root->left->left = new TreeNode(6);
    root->left->right = new TreeNode(2);
    root->right->left = new TreeNode(0);
    root->right->right = new TreeNode(8);

    TreeNode* lca = lowestCommonAncestor(root, 6, 2);
    if (lca != nullptr) {
        cout << "LCA: " << lca->val << endl;
    }
}
`,
  },
  {
    id: 'diameter-of-tree',
    name: '12. Diameter of Binary Tree (LC 543)',
    category: 'LeetCode & Competitive Programming',
    description: 'Calculates the length of the longest path between any two nodes in a tree.',
    explanation: 'Computes subtree depth bottom-up and tracks global maximum diameter (leftH + rightH).',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

int maxDia = 0;

int calculateDepth(TreeNode* root) {
    if (root == nullptr) return 0;
    int leftH = calculateDepth(root->left);
    int rightH = calculateDepth(root->right);

    if (leftH + rightH > maxDia) {
        maxDia = leftH + rightH;
    }
    return 1 + max(leftH, rightH);
}

int main() {
    TreeNode* root = new TreeNode(1);
    root->left = new TreeNode(2);
    root->right = new TreeNode(3);
    root->left->left = new TreeNode(4);
    root->left->right = new TreeNode(5);

    calculateDepth(root);
    cout << "Diameter: " << maxDia << endl;
}
`,
  },
  {
    id: 'symmetric-tree',
    name: '13. Symmetric / Mirror Tree (LC 101)',
    category: 'LeetCode & Competitive Programming',
    description: 'Checks whether a binary tree is a mirror of itself around the center.',
    explanation: 'Uses dual simultaneous recursion to verify t1->left matches t2->right and t1->right matches t2->left.',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

bool isMirror(TreeNode* t1, TreeNode* t2) {
    if (t1 == nullptr && t2 == nullptr) return true;
    if (t1 == nullptr || t2 == nullptr) return false;
    if (t1->val != t2->val) return false;
    return isMirror(t1->left, t2->right) && isMirror(t1->right, t2->left);
}

bool isSymmetric(TreeNode* root) {
    if (root == nullptr) return true;
    return isMirror(root->left, root->right);
}

int main() {
    TreeNode* root = new TreeNode(1);
    root->left = new TreeNode(2);
    root->right = new TreeNode(2);
    root->left->left = new TreeNode(3);
    root->left->right = new TreeNode(4);
    root->right->left = new TreeNode(4);
    root->right->right = new TreeNode(3);

    bool sym = isSymmetric(root);
    if (sym) {
        cout << "Tree is Symmetric" << endl;
    } else {
        cout << "Tree is Not Symmetric" << endl;
    }
}
`,
  },
  {
    id: 'path-sum',
    name: '14. Path Sum Root-to-Leaf (LC 112)',
    category: 'LeetCode & Competitive Programming',
    description: 'Determines if the tree has a root-to-leaf path summing to targetSum.',
    explanation: 'Subtracts current node value and recurses down to leaf nodes checking if remainder matches leaf.',
    code: `#include <iostream>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

bool hasPathSum(TreeNode* root, int targetSum) {
    if (root == nullptr) return false;
    if (root->left == nullptr && root->right == nullptr) {
        return targetSum == root->val;
    }
    int remain = targetSum - root->val;
    return hasPathSum(root->left, remain) || hasPathSum(root->right, remain);
}

int main() {
    TreeNode* root = new TreeNode(5);
    root->left = new TreeNode(4);
    root->right = new TreeNode(8);
    root->left->left = new TreeNode(11);
    root->left->left->left = new TreeNode(7);
    root->left->left->right = new TreeNode(2);
    root->right->left = new TreeNode(13);
    root->right->right = new TreeNode(4);

    bool found = hasPathSum(root, 22);
    if (found) {
        cout << "Path found for sum 22" << endl;
    } else {
        cout << "No path found" << endl;
    }
}
`,
  },
];
