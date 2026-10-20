# tree-vs

Interactive C++ Tree & Graph Algorithm Visualizer with Time-Travel Execution

tree-vs is a specialized in-browser developer tool that compiles, executes, and visualizes C++ tree and graph algorithms step by step in real time. Rather than relying on a heavy server-side sandbox or pre-rendered animations, tree-vs executes an in-browser recursive descent parser and virtual machine that parses raw C++ source code into an Abstract Syntax Tree (AST), executes statements incrementally, and dynamically positions tree nodes using the linear-time O(N) Buchheim tree layout algorithm on an infinite vector SVG canvas.

---

## Architectural Overview

The application is structured into five decoupled subsystems:

```
[Raw C++ Code & Stdin]
          |
          v
+-------------------------------------------------------+
| 1. Compiler Pipeline (src/core/interpreter/)           |
|    - Lexer / Scanner (lexer.ts) -> Token Stream        |
|    - Recursive Descent Parser (parser.ts) -> AST Tree  |
|    - AST Type Definitions (ast.ts) -> Discriminated    |
+-------------------------------------------------------+
          |
          v
+-------------------------------------------------------+
| 2. Virtual Machine Runtime (evaluator.ts)              |
|    - Tree-Walk Evaluator Loop                         |
|    - Stack Frames, Closures & References (&x)         |
|    - STL Emulation (vector, queue, stack, map, set)   |
|    - Immutable State Snapshots (TraceSnapshot[])      |
+-------------------------------------------------------+
          |
          v
+-------------------------------------------------------+
| 3. Layout Engine (src/core/layout/tidyTree.ts)         |
|    - Buchheim-Jünger-Leipert Linear O(N) Algorithm    |
|    - Post-order Subtree Bounding Widths               |
|    - Pre-order Parent Midpoint Centering              |
+-------------------------------------------------------+
          |
          v
+-------------------------------------------------------+
| 4. Graphics & Vector Viewport (src/components/canvas/) |
|    - 2D Matrix Camera Transformation (Pan & Zoom)     |
|    - Crisp Vector SVG Elements (Circle & Text)        |
|    - Cubic Bézier Splines for Branch Routing          |
|    - Dynamic Variable Pointer Badges (FLIP Animation) |
+-------------------------------------------------------+
          |
          v
+-------------------------------------------------------+
| 5. Time-Travel Debugger & UI (src/App.tsx, controls)   |
|    - 0ms Array Lookup Timeline Scrubber               |
|    - Bidirectional Step Execution                     |
|    - Monaco Editor Executing Line Glyph Highlighting  |
|    - Live Call Stack Frame & Variable Inspection      |
+-------------------------------------------------------+
```

---

## Core Engineering Subsystems

### 1. In-Browser C++ Compiler & Virtual Machine

Unlike standard web visualizers that only run hard-coded animations, tree-vs includes a purpose-built C++ compiler frontend and step-by-step tree-walk virtual machine written in TypeScript:

- **Lexical Scanner (`src/core/interpreter/lexer.ts`)**: Scans raw source text into typed tokens (`KEYWORD`, `IDENTIFIER`, `NUMBER`, `OPERATOR`, `SYMBOL`). Handles multi-character C++ operators (`->`, `::`, `<<`, `>>`, `++`, `--`, `&&`, `||`, `!=`, `==`, `<=`, `>=`).
- **Recursive Descent Parser (`src/core/interpreter/parser.ts`)**: Constructs an Abstract Syntax Tree with lookahead support. Disambiguates complex constructs such as:
  - C++17 structured bindings: `for (auto &[key, value] : mp)`
  - Template type arguments: `map<int, int> mp`, `vector<vector<int>> adj`
  - Competitive programming global array syntax: `vector<int> tree[100005]`
  - Standard 3-clause for loops, while loops, and recursive function declarations
- **Discriminated Union AST (`src/core/interpreter/ast.ts`)**: Defines strongly typed AST interfaces with discriminator tags (`FunctionDecl`, `RangeForStatement`, `BinaryExpression`, `CallExpression`, etc.), enabling zero type assertion errors during traversal.
- **Tree-Walk Virtual Machine (`src/core/interpreter/evaluator.ts`)**:
  - Maintains virtual call stack frames containing local variables, parameters, and function scope metadata.
  - Implements pass-by-reference semantics (`int &maxd`, `map<int, int>& mp`) using closure getter/setter references bound to caller stack frames.
  - Simulates standard STL containers: `std::vector`, `std::queue`, `std::stack`, `std::map`, and `std::set`.
  - Automatically orients bidirectional competitive programming adjacency lists into clean parent-child tree hierarchies, eliminating parent back-edges.

### 2. Collision-Free Tree Layout Engine

Manual or naive tree positioning often causes sibling subtrees to overlap. tree-vs implements the **Buchheim-Jünger-Leipert (2002)** algorithm (`src/core/layout/tidyTree.ts`), an O(N) linear-time refinement of the Reingold-Tilford aesthetic layout rules:

1. **Aesthetic Rule 1**: Nodes on the same hierarchical depth share identical Y coordinates (`y = depth * LEVEL_HEIGHT_Y`).
2. **Aesthetic Rule 2**: Left-to-right relative child order is strictly preserved.
3. **Aesthetic Rule 3**: Parent nodes are centered directly above the horizontal midpoint of their children (`x = (leftmostChild.x + rightmostChild.x) / 2`).
4. **Aesthetic Rule 4**: Subtrees with identical structure are drawn with identical spacing regardless of where they appear in the tree.

The layout operates in two linear passes:
- **Pass 1 (Post-Order Bottom-Up)**: Recursively computes bounding box widths for each subtree. If a binary node has only a right child, a left placeholder width is reserved so branching direction remains visually intuitive.
- **Pass 2 (Pre-Order Top-Down)**: Centers parent nodes and outputs absolute (X, Y) canvas coordinates in pixel space.

### 3. Graphics & Infinite SVG Viewport

- **Pure Vector SVG**: Rendered directly into DOM elements (`<circle>`, `<path>`, `<text>`), allowing infinite zooming without bitmap pixelation.
- **Cubic Bézier Splines (`src/components/canvas/TreeEdgeRenderer.tsx`)**: Tree connections are drawn using smooth vertical cubic Bézier curves:
  ```
  M sourceX sourceY C sourceX (sourceY + dy), targetX (targetY - dy), targetX targetY
  ```
  Where `dy = (targetY - sourceY) * 0.5`. This produces clean, organic branches without sharp elbows or overlapping edge crossings.
- **2D Camera Transform (`src/components/canvas/CanvasViewport.tsx`)**: Supports click-and-drag mouse panning and cursor-centered zoom scaling. The zoom transformation mathematically projects the coordinate directly beneath the mouse cursor so that the point under the cursor remains stationary during zoom:
  ```typescript
  const newZoom = Math.min(Math.max(zoom * factor, 0.2), 3.0);
  const cursorX = e.clientX - containerRect.left;
  const cursorY = e.clientY - containerRect.top;
  setPan({
    x: cursorX - (cursorX - pan.x) * (newZoom / zoom),
    y: cursorY - (cursorY - pan.y) * (newZoom / zoom)
  });
  ```
- **Tracking Pointer Badges (`src/components/canvas/PointerBadges.tsx`)**: Program variables pointing to tree nodes (such as `root`, `curr`, `parent`, `child`, `u`, `v`) are rendered as floating badge pills anchored to node centers using GPU-accelerated CSS `transform: translate3d` transitions.

### 4. Time-Travel Debugging Engine

Unlike standard debuggers that require re-running an entire program from scratch to step backward, tree-vs executes the program to completion initially and records an immutable sequence of snapshots:

- Every statement boundary triggers `recordStep()`, capturing a deep-cloned snapshot of the virtual heap, call stack frames, local variables, active line numbers, and stdout text.
- Stepping backward or jumping via the timeline scrubber is an instant **O(1) array lookup** (`trace[stepIndex]`), providing 0ms latency rewinding and forward scrubbing.
- Synchronized playback drives active line highlight decorations in Monaco Editor alongside active node state styling (`active`, `visited`, `found`, `normal`).

---

## Repository Architecture

```
tree-vs/
|-- src/
|   |-- core/
|   |   |-- interpreter/
|   |   |   |-- lexer.ts             # Character scanner and token stream generator
|   |   |   |-- parser.ts            # Recursive descent AST parser with lookahead
|   |   |   |-- ast.ts               # Discriminated union type definitions for all AST nodes
|   |   |   |-- evaluator.ts         # Step-by-step virtual machine and memory model
|   |   |   `-- index.ts             # Compiler entry facade (compile, parse, execute)
|   |   |-- layout/
|   |   |   `-- tidyTree.ts          # Buchheim O(N) collision-free tree layout math
|   |   `-- algorithms/
|   |       |-- traversalAlgorithms.ts  # DFS, BFS, Inorder, Preorder, Postorder
|   |       |-- bstAlgorithms.ts        # Binary Search Tree insert, delete, search
|   |       |-- avlAlgorithms.ts        # Self-balancing AVL tree rotation operations
|   |       |-- heapAlgorithms.ts       # Min/Max binary heap sift-up and sift-down
|   |       |-- trieAlgorithms.ts       # Prefix tree Trie dictionary insertion and lookup
|   |       `-- dsuAlgorithms.ts        # Disjoint Set Union with path compression
|   |-- components/
|   |   |-- canvas/
|   |   |   |-- CanvasViewport.tsx   # Infinite SVG viewport, pan and zoom transforms
|   |   |   |-- TreeNodeRenderer.tsx # SVG circle, label, and state highlight renderer
|   |   |   |-- TreeEdgeRenderer.tsx # Cubic Bézier spline tree branch router
|   |   |   `-- PointerBadges.tsx    # Floating variable badge pointer tracker
|   |   |-- editor/
|   |   |   `-- CodeEditor.tsx       # Monaco Editor wrapper with live line glyphs
|   |   |-- callstack/
|   |   |   `-- CallStackPanel.tsx   # Recursion call frame and scope variable inspector
|   |   |-- output/
|   |   |   `-- TerminalConsole.tsx  # Virtual terminal displaying C++ cout stdout
|   |   `-- common/
|   |       |-- Controls.tsx         # Play/pause, step buttons, timeline scrubber slider
|   |       `-- Header.tsx           # Navigation bar, algorithm preset switcher
|   |-- presets/
|   |   `-- catalog.ts               # Ready-to-run C++ algorithm program catalog
|   |-- types/
|   |   |-- interpreter.ts           # TraceSnapshot, CallFrame, and ExecutionState types
|   |   |-- tree.ts                  # LayoutNode, TreeEdge, and BoundaryBox types
|   |   `-- presets.ts               # Preset algorithm metadata schema
|   |-- App.tsx                      # Top-level state coordinator and animation loop
|   |-- main.tsx                     # React application entry point
|   `-- index.css                    # Design tokens, theme variables, and layout CSS
|-- tests/
|   |-- interpreter.test.ts          # Parser and virtual machine test suites
|   |-- tree_algorithms.test.ts      # Tree traversal and layout tests
|   |-- user_code.test.ts            # Competitive programming real-world user code tests
|   `-- comprehensive_features.test.ts # End-to-end interpreter and structured binding tests
|-- vite.config.ts                   # Vite bundler configuration
|-- tsconfig.json                    # Strict TypeScript compiler options
`-- package.json                     # Project dependencies and script commands
```

---

## Supported C++ Language Features

The internal compiler supports the essential C++ features required for tree algorithms and competitive programming:

- **Functions & Recursion**: Recursive functions, return values, call stack unwinding, parameter passing.
- **Pass-by-Reference**: Lvalue references (`int &x`, `map<int, int>& mp`), modifying caller frame variables from inside child recursion calls.
- **C++17 Structured Bindings**: `for (auto &[key, value] : container)` unpacking of pairs and map entries.
- **Containers**:
  - `std::vector` (`push_back`, `pop_back`, `size`, subscript access `vec[i]`)
  - `std::queue` (`push`, `pop`, `front`, `empty`)
  - `std::stack` (`push`, `pop`, `top`, `empty`)
  - `std::map` (`mp[key] = val`, key lookup, iteration)
  - `std::set` (`insert`, `count`, `empty`)
  - `std::pair` (`p.first`, `p.second`, `make_pair`)
- **Control Flow**: `if`, `else if`, `else`, `for (int i = 0; i < n; i++)`, `for (auto item : container)`, `while`, `break`, `continue`.
- **I/O & Built-ins**: `cin >> val`, `cout << val << endl`, `max(a, b)`, `min(a, b)`, `swap(a, b)`.

---

## Tech Stack & Dependencies

- **Language**: TypeScript 6 (strict mode enabled across all compiler and UI layers)
- **Framework**: React 19.2 (component architecture and state management)
- **Bundler & Tooling**: Vite 8.3 (instant HMR and sub-second builds)
- **Code Editor**: Microsoft Monaco Editor (`@monaco-editor/react`)
- **Icons**: Lucide React (vector SVG icons)
- **Styling**: Vanilla CSS Custom Properties (zero external CSS framework overhead)
- **Testing**: Vitest with comprehensive automated test suites

---

## Getting Started

### Prerequisites

- Node.js version 18.0 or higher
- npm, pnpm, or yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/tree-vs.git

# Navigate into the project directory
cd tree-vs

# Install dependencies
npm install
```

### Development Server

Start the local development server with Hot Module Replacement:

```bash
npm run dev
```

The visualizer will be accessible at `http://localhost:5173`.

### Running Tests

Execute the automated test suites covering the parser, VM, structured bindings, and layout algorithms:

```bash
npm test
```

### Production Build

Create an optimized production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## License

MIT License. See LICENSE for details.
