# Tree-VS: deep audit and improvement plan

> Audit date: 2026-10-16. This document describes the current source and a proposed implementation roadmap. It does **not** mean the fixes have been implemented.
>
> **Primary recommendation:** make the simulator safe, truthful, and deterministic before expanding the language or adding more visual effects. A smaller, accurately documented C++ subset is more valuable than a larger subset that silently produces incorrect results.

## 1. Executive summary

Tree-VS has a good prototype foundation: a React/TypeScript UI, Monaco editing, a separately organized lexer/parser/evaluator, deterministic interpreter allocation IDs, trace-based playback, SVG rendering, and independently implemented data-structure algorithms.

The central problem is **trustworthiness**, not appearance. The current tests and build pass while several bundled examples either fail or produce misleading state. Some invalid programs are accepted as successful executions. Interpreted code can also mutate the host JavaScript prototype through an unsafe heap lookup.

### Highest-priority work

| Priority | Problem | Why it matters |
| --- | --- | --- |
| P0 | Host prototype pollution through interpreted member assignment | User source can corrupt JavaScript state in the same execution realm. Fix before treating source as safely isolated. |
| P1 | Wrong tree root/parent metadata after pointer rewiring | The AVL rotation examples finish with the wrong selected root. The picture can contradict the executed program. |
| P1 | Incorrect expression and output semantics | `&&`/`||` are eager, output precedence is wrong, and `endl` becomes `undefined`. |
| P1 | Unsupported syntax and invalid operations can silently succeed | A successful-looking trace does not reliably mean the source was understood. |
| P1 | Synchronous execution on every edit with incomplete resource limits | Incomplete source runs while typing; pathological input can block the interface or exhaust memory. |
| P1 | Run hotkey captures old source | Ctrl/Cmd+Enter can execute mount-time code rather than the visible editor contents. |
| P1 | Camera automatically refits across trace events | Manual inspection is disrupted while stepping. |
| P1, library scope | Clock-derived BST/AVL IDs and binary-only Trie/DSU topology | Chained operations can corrupt nodes; non-binary structures lose visible connections. These libraries are not currently the app's execution path. |

**Priority meanings:** P0 = isolation failure/release blocker; P1 = central correctness or severe usability/reliability issue; P2 = important hardening, accessibility, maintainability, or edge-case correctness; P3 = polish or optional expansion. Priority is not a claim about a formal CVSS score.

### What not to do first

- Do not rewrite the entire application or replace React/SVG simply because issues exist.
- Do not add many presets until every shipped preset has semantic integration tests.
- Do not attempt full C++ conformance incrementally without a product decision.
- Do not add a backend, accounts, cloud storage, or telemetry without a demonstrated requirement.
- Do not mistake passing TypeScript/lint checks for language-semantic correctness.

## 2. Scope, evidence, and limitations

### Reviewed

- All application components and orchestration in `src/App.tsx`.
- All interpreter files: `ast.ts`, `lexer.ts`, `parser.ts`, `evaluator.ts`, and `index.ts`.
- BST, AVL, heap, DSU, Trie, and traversal step generators.
- `src/core/layout/tidyTree.ts` and shared types.
- All nine bundled presets and both existing test files.
- Loaded CSS, unused starter CSS/assets, entry points, HTML metadata, package scripts/lockfile context, TypeScript/Vite/lint configuration, README, and public directory inventory.
- Relevant installed dependency metadata and Monaco loader defaults.

Generated `dist` and third-party `node_modules` were not treated as project source requiring a line-by-line audit. Dependency inspection was targeted, not a complete supply-chain audit.

### Evidence labels used below

- **Reproduced:** observed using local execution/probes.
- **Source-confirmed:** directly established from the implementation; actual browser presentation may still need testing.
- **Risk / proposal:** expected failure mode or improvement, not a measured production incident.

Local probes were bounded; cycle tests used subprocess time limits. No external source execution or network audit was required. Prototype-pollution probes ran in disposable processes and removed their marker afterward.

### Baseline validation

Environment observed: Node `v26.11.1`, npm `12.2.0`.

| Check | Observed result |
| --- | --- |
| `npm test` | 2 files, **13 tests passed**: 2 interpreter tests and 11 algorithm/layout tests. |
| `npm run build` | Passed TypeScript project build and Vite production build. |
| `npm run lint` | 0 errors, **1 warning**: synchronous state updates through execution effect at `src/App.tsx:68`. Command exits successfully. |
| `./node_modules/.bin/tsc -p tsconfig.app.json --strict --pretty false` | Passed. Enabling `strict` is currently a low-friction improvement, though explicit `any` still bypasses it. |
| Production assets | App JS approximately **295.51 kB**, gzip **90.78 kB**; CSS **10.20 kB**, gzip **2.53 kB**. This is not the full cold-load cost because Monaco/fonts can load externally. |
| Repository metadata | `git status` was unavailable: the provided directory is not recognized as a Git repository. No baseline diff/history could be inspected. |

Additional targeted checks covered preset execution, expression semantics, prototype pollution, sequential BST/AVL IDs, deletion parent invariants, n-ary connectivity, traversal snapshot mutation, Trie Unicode, invalid DSU inputs, cycle termination, deep layout/height recursion, and heap behavior.

**Not performed:** real-browser E2E, screen-reader/axe checks, touch/trackpad interaction, Lighthouse, measured UI latency/memory profiling, live dependency vulnerability lookup, production-host header checks, or native C++ differential testing. Browser-specific claims below are explicitly candidates for validation, not reports of observed screenshots.

## 3. Current architecture and product mismatch

### Actual application path

```text
Preset or editor text
  -> App.executeTrace()
  -> tokenize()
  -> Parser.parseProgram()
  -> Evaluator.run()
  -> complete in-memory TraceEvent[]
  -> selected timeline event
  -> computeTreeLayout(nodes, rootId)
  -> SVG edges, nodes, pointer badges
  -> output console and stack inspector
```

Despite the component name and everyday use of “canvas,” rendering is **SVG**, not the HTML Canvas API. SVG is a reasonable choice for this scale and for future accessibility; no immediate renderer replacement is justified.

### Two separate execution systems

`src/core/algorithms/*.ts` generates explanatory snapshots directly in TypeScript. `App.tsx` does not import those algorithms: the current UI runs the C++ subset interpreter instead. Consequently:

- Algorithm unit tests do **not** validate equivalent C++ execution.
- Fixing an AVL helper does not fix interpreted rotations.
- Heap/Trie/DSU helpers existing in source does not mean their C++ syntax/runtime is supported in the editor.
- `types/presets.ts` describes a richer catalog than the `PresetProgram` interface actually used in `presets/catalog.ts`.
- `components/auxiliary` has no implementation in the supplied tree, and queue/heap/DSU auxiliary data has no dedicated visible panel.

**Decision needed:** keep the product code-first, and treat these libraries as reference/test implementations; or explicitly introduce a separate “guided algorithm” mode. Do not blur the two modes or imply the displayed diagram comes from user code when it actually comes from a canned algorithm.

### Recommended scope statement

“An educational simulator for a documented subset of C++ focused on tree algorithms. Source is interpreted locally; it is not compiled by g++.”

The editor already says “C++ subset,” but `TerminalConsole.tsx:36` displays a fake `g++ main.cpp && ./a.out` command. `index.html:7` advertises heaps, Trie, DSU, and graph execution beyond the current UI/runtime. Align the marketing, README, presets, and console with verified functionality.

## 4. Interpreter: correctness and safety

### I-01 — P0: unsafe dictionaries allow host prototype pollution

**Reproduced.** `src/core/interpreter/evaluator.ts:17–18, 238–247, 321–323, 375–377` uses normal objects as lookup tables and interprets strings as pointers.

```cpp
int main() {
    string p = "__proto__";
    p->__treevsAuditMarker = 123;
}
```

After this source runs, an ordinary host object can inherit `__treevsAuditMarker === 123`. `heap["__proto__"]` resolves to `Object.prototype`, and member assignment writes onto it. Inherited names such as `constructor`/`toString` also interfere with identifier/function lookup.

**Fix:**

1. Use `Map` or null-prototype dictionaries for heap, functions, environments, and derived dictionaries; use own-property checks where objects remain.
2. Represent pointers as tagged runtime values, not strings indistinguishable from user text.
3. Validate dereference targets, allowed fields, and field value types.
4. Apply the same dictionary discipline to future container/member implementations and imported traces.
5. Add regression tests proving host prototypes remain unchanged.

**Acceptance:** prototype names cannot resolve to inherited host values; forged pointers are rejected; every run leaves `Object.prototype` unchanged. Moving execution into a worker is additional containment, **not** a substitute for this fix and not a complete language security sandbox.

### I-02 — P1: root selection and parent metadata contradict pointer state

**Reproduced.** Child assignment sets the new child's parent but never clears/reconciles the old relationship (`evaluator.ts:241–248`). Root selection chooses the first parentless allocation, falling back to the first allocation (`71–78`).

The bundled LL rotation ends with `main.root = n1` (20) but `treeSnapshot.rootId = n0` (30). LR ends with `main.root = n2` (20), also displayed from `n0`. Parent metadata can form cycles even after the forward links are correct.

**Fix:**

- Treat the interpreted `left`/`right` links as authoritative memory state. Derive visualization parents rather than maintaining an unsafe second truth.
- Select the displayed root from an explicit user-selected binding, entry-point result, or documented default binding—not allocation order alone.
- Separate the reachable tree view from the complete allocation/heap view. An allocated but detached node is not automatically deleted or garbage-collected in C++.
- Represent forests, shared children, and cycles honestly. Diagnose them or use an explicit graph fallback instead of silently pretending every intermediate heap is a valid tree.
- **Do not reject every transient cycle at assignment time:** a valid rotation can temporarily create a cycle between successive pointer writes. Render intermediate memory safely and validate stable tree boundaries separately.

**Acceptance:** LL/LR roots and edges match `main.root`; subtree detachment does not leave false parents; pointer aliases preserve identity; multiple disconnected allocations have a documented display policy.

### I-03 — P1: logical operators do not short-circuit

**Reproduced.** `evaluator.ts:341–368` evaluates both operands before applying `&&`/`||`.

```cpp
int f() { cout << 9; return 1; }
int main() { bool x = false && f(); }
```

Actual stdout is `9`; expected stdout is empty. This also breaks standard null-guard semantics.

**Fix:** evaluate RHS lazily for logical operators. Test skipped calls, allocations, mutations, and null dereferences for both operators.

### I-04 — P1: output/shift precedence and evaluation are incorrect

**Reproduced.** `parser.ts:340–355` gives shifts higher precedence than multiplication/addition. `cout << 1 + 2;` prints `1`, not `3`.

`evaluator.ts:330–342` can evaluate a non-output shift's left operand twice. Numeric shifts have no implemented evaluator cases. A side-effecting `f() << 1` can call `f()` twice; `8 >> 1` yields `undefined`.

**Fix:** correct the precedence table, evaluate operands once, use a tagged output-stream value, and either correctly implement numeric shifts or reject them. A string equal to `"cout"` must not act as a stream.

**Acceptance:** precedence tests mix arithmetic, comparisons, shifts, and output; side-effecting operands execute only as specified by the supported semantics.

### I-05 — P1: invalid runtime operations silently look successful

**Reproduced.** Unknown identifier reads return `undefined`; assignments can create undeclared locals; null/invalid member operations can return `undefined` or do nothing; arbitrary fields can be created (`evaluator.ts:225–255, 315–323, 373–379`).

```cpp
int main() {
    TreeNode* p = nullptr;
    cout << p->val;
}
```

This prints `undefined` without reporting invalid dereference.

**Fix:** checked binding lookup, explicit uninitialized state, validated lvalues, type-aware member access, and structured runtime errors. Do not fabricate deterministic success for undefined behavior. Stop with an educational diagnostic while preserving the valid partial trace/output.

### I-06 — P1: parser accepts malformed or unsupported code as other statements

**Reproduced.** Many terminators use optional `match(';')`; invalid assignment targets consume RHS without rejection (`parser.ts:167, 271, 288, 299–325`). Member calls are not parsed as calls (`456–485`).

Examples accepted without meaningful semantics include missing semicolons, `1 = 2;`, and some `q.push(1)` statements. `new TreeNode{1}` does not mean what its appearance suggests. `x * y;` can be mistaken for a declaration because declaration detection treats the second token `*` as sufficient (`218–224`).

**Fix:** require grammar tokens and valid identifiers, use a real declared-type table for declaration disambiguation, validate lvalues, and emit precise unsupported-feature errors. Require parser progress on every loop and complete consumption of a supported construct.

**Acceptance:** unsupported code either gains correct tested semantics or produces a source-positioned rejection. It must never become a silent no-op by accident.

### I-07 — P1/P2: scopes, globals, signatures, and allocation types are mostly annotations

**Reproduced / source-confirmed.**

| Problem | Evidence | Remedy |
| --- | --- | --- |
| Global declarations/initializers are ignored | `evaluator.ts:26–32`; a global `int x = 7` prints `undefined` in `main` | Add global environment and defined initialization order, or explicitly reject globals initially. |
| Blocks do not create scope | `217, 291–297`; inner `int x = 2` overwrites outer `x = 1` | Lexical environment stack; test shadowing and lifetime. |
| Missing/extra call arguments accepted | `167–176` | Validate arity and supported parameter types; reject duplicate definitions. |
| Parsed references do not alias caller bindings | `parser.ts:119–132`; evaluator copies values | Reject references until aliasing is implemented. |
| Builtin names override user definitions | `evaluator.ts:402–406` | Explicit builtin registry and collision policy. |
| `new` ignores type and all arguments after the first | `382–395`; `new int(7)` becomes a tree node | Validate supported schema/type/arity; implement documented child arguments or reject them. |
| Struct schemas are ignored | `26–32, 382–395` | Register approved node schemas, validate fields, or explain the fixed `TreeNode` model. |

A three-argument `TreeNode` construction currently skips evaluation of later arguments entirely, losing child allocations and their side effects.

**Acceptance:** no advertised type construct is silently ignored. Start with a narrow validated schema before attempting arbitrary C++ structs/classes.

### I-08 — P2: arithmetic, literals, and output formatting diverge from C++

**Reproduced.** `evaluator.ts:345–368` uses JavaScript values/operators and `Math.floor` division; `lexer.ts:96–131` conflates character and string literals and accepts arbitrary digit/dot sequences.

| Case | Current behavior | Required behavior/policy |
| --- | --- | --- |
| `(0 - 3) / 2` | `-2` | Integer division truncates toward zero: `-1`. |
| `1 / 0` | `Infinity` | Explicit invalid-arithmetic diagnostic. |
| `1.2.3` | `NaN` | Lexical error. |
| `5.0 / 2.0` | `2` | Support floating point correctly or reject it. |
| `'a' + 1` | String concatenation `a1` | Correct character semantics or explicit unsupported-feature error. |
| `true == 1` | False | Define supported C++ conversion rules rather than JS strict equality. |
| `cout << true << false` | `truefalse` | Standard default output is `10`; implement/document formatting policy. |

Define the numeric model explicitly: supported integer width/range, overflow handling, float support, bool conversion, remainder, and character behavior. Do not accidentally inherit JavaScript 53-bit integer limitations or 32-bit bitwise conversion rules while claiming C++ semantics. Full machine-accurate C++ integer behavior can be deferred if limitations are visible and invalid cases are rejected.

### I-09 — P2: lexer silently drops errors and output escapes are broken

**Reproduced.** `lexer.ts:73–85, 109–131, 173–175` accepts unterminated comments/strings, drops unknown characters, and removes backslashes without decoding escapes. `cout << "a\nb"` produces `anb`; `cout << @7` can print `7` successfully.

`endl` is never resolved to the special value expected by `evaluator.ts:334–335`, so the max-depth preset prints `Max Depth: 3undefined`.

Columns drift after block-comment delimiters; physical newlines in strings do not update source positions correctly.

**Fix:** explicit lexical errors, validated literal syntax, supported escape decoding, accurate start/end source spans, and an explicit `endl` builtin/manipulator.

**Acceptance:** exact line/column tests cover comments, escapes, newlines, EOF, invalid characters, and unterminated tokens.

### I-10 — P2: empty statements create invalid AST children

**Reproduced.** `parser.ts:195–197` returns `null` for `;`, but `if`/`while` attach it with non-null assertions (`237, 256`). Evaluator then reads `stmt.type` and throws an internal null-property error.

**Fix:** explicit `EmptyStatement` node, handled exhaustively. Test `if (true);`, empty `else`, false empty loops, and bounded infinite empty loops.

### I-11 — P1: the 1,000-step limit is not a complete execution budget

**Source-confirmed risk; basic infinite-loop guard reproduced.** `evaluator.ts:61–64` charges only trace emission, not every unit of work. The `stepCount++ > maxSteps` condition allows 1,001 recorded events.

Unbounded dimensions include source size, tokens, parse depth, AST size, expression depth/work, native recursion, allocations, string growth, stdout, and retained trace bytes. Repeated string doubling can consume huge memory in far fewer than 1,000 recorded steps. All phases currently run synchronously (`interpreter/index.ts:10–16`).

**Fix:**

- Introduce explicit execution options: instruction budget, call depth, source/tokens/AST limits, heap nodes, string/output size, trace events/bytes.
- Charge work independently of whether an educational event is emitted.
- Run parsing/evaluation in a dedicated worker. Use run IDs, stale-result rejection, cancellation, and main-thread timeout/worker termination.
- A cancel message alone cannot interrupt a worker stuck in synchronous evaluation; use cooperative checks/yields or terminate/recreate it.
- Keep output and trace transport bounded; a worker posting one enormous message can still block the UI or duplicate memory.
- Return specific limit errors, not a blanket assertion that all long programs are infinite.

**Acceptance:** deterministic small-budget tests terminate; adversarial tests have an external timeout; a newer Run cancels/supersedes an older result; editing/panning remain usable during execution.

### I-12 — P2: AST and trace contracts are too weak

`ast.ts` defines broad `BaseASTNode` children instead of a closed discriminated union, and evaluator branches cast extensively to `any`. `types/interpreter.ts:24–27` duplicates an even looser AST shape. `UnaryExpression` is named but not implemented.

Frame lines remain at function declaration lines (`evaluator.ts:178–183`); return events use declaration lines after popping frames (`198–202`). Pointer arguments are formatted as node values (`124–129, 146–151`), losing identity when different nodes have equal values. `InterpreterResult.errorLine` exists but is not populated.

**Fix:**

- Separate statement/expression unions, source spans, and exhaustive visitors.
- Tagged runtime values and control-flow results instead of untyped sentinel objects.
- Structured diagnostics: phase, code, message, span, relevant frame/run ID.
- Stable call invocation IDs instead of IDs derived only from stack depth.
- One canonical frame representation, adapted for UI instead of duplicating stack snapshots.
- Preserve pointer IDs and present values alongside them, not instead of them.
- Explicit trace event kinds such as call, return, declaration, condition, allocation, write, output, and error. Styling must not depend on parsing English explanation strings.
- Document whether a step is before or after a mutation, and which source location represents a call/return.

**Acceptance:** exact frame/call-site tests, snapshot isolation, error spans, stable pointer identities, and exhaustive TypeScript dispatch.

## 5. Bundled preset compatibility

Local execution of every current preset produced:

| Preset ID | Observed outcome | Required regression |
| --- | --- | --- |
| `bst-insert` | Completes; final selected root `n0` | Assert final ordering, edges, node count, duplicate policy, and root. |
| `bst-search` | Completes | Assert returned pointer is node 20, successful/missing cases, and actual short-circuiting. |
| `bst-delete` | Completes | Assert resulting reachable tree, parent consistency, and detached allocation policy. |
| `tree-invert` | Completes | Assert all mirrored links and unchanged node identities. |
| `max-depth` | Completes, but stdout is `Max Depth: 3undefined` | Expect computed depth 3 and proper newline. |
| `avl-ll-rotation` | Completes, but selected root is 30 instead of 20 | Assert `main.root`, selected root, and complete final topology agree. |
| `avl-lr-rotation` | Completes, but selected root is 30 instead of 20 | Same, plus each intermediate rotation is safe to inspect. |
| `inorder-traversal` | Stdout is `1 2 3 4 5 6 7 ` | Preserve exact order and verify call/return frames. |
| `level-order-bfs` | Fails at `!` on preset source line 16 | Implement the complete required feature set or mark unsupported/remove from selectable examples temporarily. |

BFS needs **all** of unary negation, a queue runtime value, member-call parsing, and `push`, `empty`, `front`, `pop` behavior. Fixing only `!` will not make it work.

Preset tests should declare expected stdout, computed results, root binding, and final edges. “No error” alone is insufficient. Verify snippets with a chosen native C++ standard/toolchain when adding differential tests; `new TreeNode(value)` without an explicit constructor relies on modern aggregate initialization rules. Do not blindly use the console's fake g++ command as a correctness oracle.

Correct educational wording: BST search is **O(h)** and is O(log n) only when the height is logarithmic; it is O(n) for a skewed tree (`catalog.ts:62–63`). Inorder is sorted only for a valid BST. Explain duplicate-value policies consistently across presets and reference algorithms.

## 6. Data model, algorithms, and layout

These findings affect reusable core libraries. They are important, but most are not in the current `App -> interpreter` path.

### A-01 — P1: BST/AVL node IDs can collide and corrupt topology

**Reproduced with a frozen clock.** `bstAlgorithms.ts:204, 295–308` and `avlAlgorithms.ts:40, 110–124` derive IDs from `Date.now() % 100000`.

Two chained inserts in the same millisecond can overwrite a node and create self-links. AVL height recomputation can then overflow the stack. The modulo also permits repetition after 100 seconds.

**Fix:** injected deterministic allocator or collision-checked monotonic ID creation. Tests must chain operations under a constant clock and assert unique IDs/no lost nodes.

### A-02 — P1: binary topology loses Trie/DSU edges

**Reproduced.** `types/tree.ts:24–35` has only `left/right`; `trieAlgorithms.ts:47–64` and `dsuAlgorithms.ts:38–48` retain only the first two children.

A Trie built from `['a', 'b', 'c']`, or DSU parents `[0,0,0,0]`, contains a third child with no rendered parent edge. Layout can promote that child to a separate root even though its logical parent is known.

**Fix:** separate runtime/domain representation from visualization topology. Use ordered children or explicit typed edges with binary side labels where needed. Keep binary-tree, n-ary Trie, and DSU forest adapters explicit. Honor `rootIds` for forests instead of relying on inference.

**Acceptance:** every valid domain relation has exactly one corresponding rendered edge; Trie labels remain characters, not arbitrary L/R labels; DSU connectivity matches groups.

### A-03 — P2: root deletion leaves a dangling parent

**Reproduced.** Deleting 10 from `[10,5]` gives root `n1` whose parent is missing `n0`. `bstAlgorithms.ts:464–470` updates the promoted child's parent only for non-root deletion.

**Fix:** root promotion sets parent to `null`. Cover root/non-root deletion of leaves, one-child nodes, two-child nodes, missing keys, and the last node.

### A-04 — P2: traversal history mutates retroactively

**Reproduced.** `traversalAlgorithms.ts:149, 166, 189, 212, 218–220` copies the stack array but shares frame objects, then mutates popped-frame status. Earlier “Call traverse” snapshots already show `returning`.

**Fix:** immutable frame records or copy frames at event capture. Emit the return event before removing the frame if it should remain visible. Assert earlier snapshots remain unchanged after generation and later steps.

### A-05 — P2: Trie accepts strings it cannot subsequently find

**Reproduced.** Construction iterates lowercased Unicode code points; search indexes original UTF-16 code units and lowercases each separately (`trieAlgorithms.ts:30, 95–102`). Self-search fails for `😀` and `İ`. The `*` sentinel maps every literal `*` node to `ROOT` (`54`).

**Fix:** normalize full inputs consistently, iterate both the same way, and identify the root by ID. If ASCII-only is intended, validate and document it instead. Define empty-word, case, normalization, and prefix behavior.

### A-06 — P2: invalid DSU inputs report false success

**Reproduced.** Find index 7 in a one-element DSU can return “root undefined”; union with index 7 can report a merge and increase the valid element's rank (`dsuAlgorithms.ts:76–118, 172–204, 235–263`).

**Fix:** validate element indices, integer bounds, parent-array bounds, lengths, ranks, and acyclicity before execution. Use an explicit error result; never encode invalid targets as `uundefined`.

### A-07 — P2: graph assumptions are not enforced

**Reproduced with bounded subprocesses:** DSU parents `[1,0]` and BFS on a self-loop fail to terminate within the probe limit. Recursive consumers also assume valid trees. Layout's visited sets avoid some recursion but do not make malformed topology correct.

A disconnected cycle can receive identical fallback coordinates `(100,100)` for its nodes (`tidyTree.ts:153–154`), contradicting the unconditional “collision-free” claim.

**Fix:** reusable validation for missing references, self-links, cycles, shared ownership, roots, and reciprocal metadata. Tree algorithms should reject invalid stable inputs; general graphs need graph-specific semantics. Intermediate interpreter heaps should be handled safely without imposing stable-tree restrictions on every pointer write.

### A-08 — P2: deep valid structures overflow recursion

**Reproduced:** a 20,000-node chain overflows `computeTreeLayout()` and `computeHeightsAndBF()` (`tidyTree.ts:72–137`, `avlAlgorithms.ts:16–26`). Recursive traversal, inversion, and Trie flattening have similar inspection risks.

**Fix:** iterative passes or explicit supported depth/node limits. Publish tested limits instead of claiming arbitrary-depth guarantees.

### A-09 — P2: layout bounds disagree with their dimensions

**Reproduced.** `tidyTree.ts:222–228` clamps width/height without expanding endpoints. A single node returns horizontal extents of 124 but width 500, and vertical extents of 124 but height 350.

**Fix:** distinguish actual content bounds from minimum viewport dimensions, or keep all six values mathematically consistent. Test `width === maxX - minX`, `height === maxY - minY` under the chosen contract.

### A-10 — P2: input/ordering contracts are too broad

`TreeNodeData.val` accepts strings. Inserting into a BST containing `'not-a-number'` can report a numeric value as already present because both comparisons against `NaN` are false (`bstAlgorithms.ts:244–290`; similar AVL branches).

**Fix:** numeric-specific BST/AVL APIs or an explicit comparator; validate finite numbers and valid starting order. AVL insertion needs a documented valid-AVL precondition. Validate level-order input, unreachable trailing entries, sparse/null roots, duplicates, and heap mode/preconditions.

### Layout quality improvements after correctness

- Preserve binary left/right direction for one-child nodes; currently compacting children centers either child below its parent. Labels help, but geometry should not imply left/right are interchangeable.
- Measure or bound long node values, metadata badges, edge labels, and pointer stacks. Circle non-overlap is not equivalent to annotation non-overlap.
- Prefer stable positions between adjacent events; avoid unnecessary full-tree motion after minor edits.
- Namespace SVG definition IDs if multiple viewports are introduced.
- Replace absolute “guaranteed collision-free” comments with documented assumptions and property tests.

## 7. Application, editor, and playback

### U-01 — P1: separate editing from execution

**Source-confirmed.** `App.tsx:58–69` synchronously runs the interpreter whenever `code` changes, resetting trace/index and stopping playback. The comment says preset changes, but the dependency is all edits.

**Fix:** keep `draftSource` separate from executed source/run state. Run explicitly, with optional clearly labelled debounced live mode later. Retain the last successful trace while editing; label it stale and avoid mapping old execution highlights onto changed source as though they were current. Warn before discarding edited code on preset changes and separate “Re-run,” “Restart playback,” and “Restore preset.”

### U-02 — P1: Ctrl/Cmd+Enter captures a stale callback

**Source-confirmed.** `CodeEditor.tsx:59–62` registers a mount-time closure. The inline callback from `App.tsx:263` captures that render's code, while the button receives updated props.

**Fix:** current-callback ref or execute using the current Monaco model. Test editing and preset switching before triggering the registered command.

### U-03 — P2: Monaco lifecycle and diagnostics integration

`CodeEditor.tsx:65–87` can skip initial highlighting because the effect runs before Monaco mounts and mount does not reapply decorations. A missing active line does not clear prior markers.

**Fix:** apply decorations both on mount and on updates; clear them explicitly. Populate Monaco error markers from structured lexer/parser/runtime diagnostics. Distinguish next/current line from error line; prevent stale markers after source changes. Provide visible loading failure/retry and a basic textarea fallback rather than an indefinitely blank editor.

### U-04 — P2: keyboard shortcuts interfere with native controls

`Controls.tsx:48–67` excludes only `INPUT`/`TEXTAREA`; buttons, selects, contenteditable elements, handled events, IME composition, modifiers, and repeat events are not properly scoped. Keyboard handlers can invoke actions even when matching buttons are disabled.

**Fix:** central shortcut policy, editable/interactive-target guards, modifier/composition checks, and eligibility checks in action handlers. Preserve native Space/arrow/Home/End behavior inside controls.

### U-05 — P2: playback end-state handling is inconsistent

`App.tsx:117–125` stops one tick after reaching the final event. `handlePlayToggle` rewinds at the final index even when the user is pausing (`102–107`). Previous/Next do not pause, while scrubbing/jumps do.

**Fix:** explicit playback transitions/reducer; stop on arrival at the last event, replay only when starting from completion, clamp all indices, and define consistent manual-step behavior. Avoid side effects nested inside state-updater callbacks.

**Tests:** fake timers for zero/one/many events, final arrival, replay, pause, speed changes, scrubbing, repeated Run, preset change, and unmount.

### U-06 — P2: console misrepresents outcome and hides useful output

`TerminalConsole.tsx:26–39` replaces stdout with errors, shows the final error even when viewing early events, and declares exit code 0 whenever current stdout is empty.

**Fix:** explicit ready/executing/completed/failed/cancelled state; show stdout and diagnostics together; associate failure with an event/source location; accurately label simulated execution. If exit status is shown, derive it from supported entry-point semantics, not empty output.

### U-07 — P2/P3: state inspection is incomplete

- `CallStackPanel` omits scalar locals even though trace frames carry them.
- Frame IDs are stack-depth-based, limiting reliable call selection/history.
- Null pointer variables are not emitted as markers; missing non-null targets are presented as `nullptr` in `CallStackPanel.tsx:78–80`.
- Node and frame clicks look interactive but `App.tsx:328–338` supplies no callbacks.
- Active focus uses the first pointer named either `curr` or `root`, not explicit `curr` precedence (`App.tsx:186–188`).

**Fix:** selectable frame with args/locals/return value/call site; distinct null, uninitialized, dangling, and valid pointer states; node inspector showing stable allocation ID and incoming/outgoing links. Wire selection/seek or remove deceptive affordances. Use explicit active-pointer priority.

## 8. Visualization and interactions

### V-01 — P1: preserve the camera across timeline steps

`CanvasViewport.tsx:34–51, 66–69` refits whenever the bounds object changes. Every interpreter event copies its node map, causing fresh layout/bounds objects even without structural changes (`App.tsx:181–184`). Manual pan/zoom is therefore overwritten while stepping.

**Fix:** explicit camera modes: initial/new-run fit, manual, optional follow-active, and explicit Fit. Use topology/geometry versions rather than object identity as a policy. Cache unchanged geometry separately from state styling.

**Acceptance:** pan/zoom survives ordinary Next/Prev and output-only events; Fit works on demand; switching runs has a documented reset policy.

### V-02 — P2: resize, fit, and zoom need one consistent camera model

- Viewport size is sampled only by fit/center actions; no resize observation.
- Splitter/banner/window changes leave camera calculations based on old dimensions.
- Toolbar +/−/100% changes only scale, moving content relative to the viewport center.
- Fit clamps at 0.35, which cannot fit sufficiently large trees.
- Fit ignores pointer/badge extents and reserved toolbar area.

**Fix:** `ResizeObserver`, a shared anchored-zoom helper, distinct content/viewport bounds, and explicit true-fit versus minimum-readable-zoom behavior. Preserve the world-space center in manual mode. Test camera math as pure functions.

### V-03 — P2: replace mouse-only dragging and harden wheel input

`CanvasViewport.tsx:71–117` and `App.tsx:134–159, 268–297` use mouse-only handlers. No touch pan/pinch or keyboard resizing exists. Canvas dragging stops at mouse leave; any mouse button can start it. Splitter body-style changes are not restored on all unmount/cancel paths.

The React wheel handler calls `preventDefault()`, but installed React DOM uses passive delegated wheel listeners where supported. Exact warnings/physical interaction still need browser verification. Zero vertical delta currently zooms out, and delta magnitude/mode are ignored.

**Fix:** pointer events, primary-button checks, capture, cancel/blur handling, cleanup restoring previous body styles, optional pinch, normalized wheel behavior, and a native non-passive listener only where cancellation is required. Avoid stealing ordinary page/browser gestures without a deliberate policy.

### V-04 — P3: coordinated visual states and motion

`animate-pulse-ring` and `animate-edge-flow` have no definitions in loaded styles. Some declared states (`pruned`, `highlighted`) fall through to default styling. Nodes transition while edges/badges jump, potentially producing temporary visual disconnection; browser confirmation is needed.

**Fix:** event-driven states, a visible legend, coordinated transitions, configurable speed, reduced-motion support, and labels/icons in addition to color. Use consistent theme tokens rather than scattered hardcoded color choices. Do not infer semantic events from explanation text.

## 9. Accessibility and responsive design

### P2 requirements

- Associate the preset select with a real label (`Header.tsx:37–44`).
- Label the timeline and expose meaningful `aria-valuetext` such as event/line information.
- Add selected state and appropriate tab/panel semantics plus keyboard navigation.
- Add explicit accessible names/state to toolbar controls; do not rely only on tooltips.
- Provide focus-visible styling, including controls whose outlines are removed in `index.css:491–499, 522–531`.
- Make splitters focusable separators with min/max/current values and keyboard adjustment.
- Make actual node/frame selection keyboard-operable, with a textual tree/state alternative rather than only visual SVG.
- Add SVG title/description where useful; hide decorative icons from assistive technology.
- Announce run completion/errors and deliberate step changes without flooding screen readers during autoplay.
- Verify contrast and target sizes; small icon buttons need consideration for touch users.
- Respect reduced motion and browser zoom; test keyboard-only operation and screen readers.

### Responsive requirements

The loaded `src/index.css` fixes the app to `100vh`, hides page overflow, and has no responsive workspace mode. `App.tsx` always applies the desktop grid. Unused `App.css` contains starter media rules, not a solution for this interface.

Add a narrow-screen pane switcher or stacked layout, adaptive toolbar overflow, dynamic viewport units where appropriate, and minimum editor/visualizer sizes. Compute splitter limits against the actual workspace, not just `window.innerWidth/innerHeight` and a hardcoded footer offset. Terminal height must never consume the usable editor area.

**Acceptance matrix:** 320/375px widths, desktop, short landscape windows, 200% browser zoom, mobile keyboard open, touch input, info banner expanded, and terminal at its maximum permitted height.

## 10. Performance and memory

### Confirmed cost structure

| Area | Current behavior | Improvement |
| --- | --- | --- |
| Interpreter trace | Full heap and stack/local copies per event; growing programs can retain quadratic state | Bound trace bytes; delta events/structural sharing with periodic checkpoints. |
| Traversal/inversion | O(n) events each copying O(n) nodes: Θ(n²) retained node records | Lazy/batched generation or deltas; retain random access through checkpoints. |
| Measured traversal retention | 100-node preorder retained 30,100 node records; 200 nodes retained 120,200 | Benchmark retained records/bytes, not only runtime. |
| BST/AVL generators | O(nh) snapshot overhead; AVL repeatedly recomputes global heights | Incremental heights along changed path; avoid repeated full cloning. |
| Heap generators | Rebuild tree/auxiliary array at each swim/sink step | Reuse unchanged nodes and indexed values. |
| DSU | Rewalk every node to recompute groups at many find steps; chain inputs can approach O(n³) generation work | Cache/derive groups incrementally; distinguish simulation overhead from textbook complexity. |
| Trie | Rebuild dictionary per search, scan all nodes per character, copy maps per event | Persistent child index and reusable compiled dictionary. |
| Queue use | `shift()` in level-order builder/BFS | Queue head index/deque. |
| Layout | Recomputed on every fresh node-map snapshot | Structural/geometry version cache; separate styles/pointers from coordinates. |
| Camera rendering | Pan/zoom rerenders every SVG layer and rebuilds pointer grouping | Memoized stable layers, frame-batched camera updates, profiling first. |

For deep DFS, repeated stack copies add further depth-dependent cost. Cumulative output strings and worker structured-clone transfer can also increase retention; measure actual heap behavior rather than assuming engine string sharing solves it.

### Proposed performance policy

1. Publish conservative supported node/depth/source/step limits first.
2. Establish browser benchmarks on representative low/mid-range hardware: balanced, skewed, wide, and pointer-heavy trees; output-heavy and recursive source; rapid scrubbing.
3. Record compile/execute/layout time, retained bytes, event count, frame rate/long tasks, and input responsiveness.
4. Optimize the dominant measured cost, not speculative bundle or framework changes.
5. Keep SVG initially. Add viewport culling/detail reduction only if profiling warrants it; Canvas/WebGL is an optional later renderer, not a prerequisite.
6. Checkpoint/delta designs must prove identical random-access snapshots and bounded seek time before replacing the simple full-snapshot implementation.

**Suggested starting targets, not measured guarantees:** responsive cancellation feedback within 100ms on the main thread; near-60fps camera interaction for the declared small/medium scene limit; bounded memory and explicit diagnostics for larger scenes. Final budgets should come from benchmarks and supported devices.

## 11. Build, dependencies, security, and release engineering

### R-01 — P2: remove implicit network/runtime dependencies

The app imports `@monaco-editor/react` but does not configure its loader. The installed loader defaults to `https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs`; the locally installed peer package is `monaco-editor@0.57.0`. Thus runtime editor behavior is not necessarily the local version used for types. `monaco-editor` is not explicitly listed in root dependencies.

`index.html:9–11` also fetches Google Fonts. The app has no backend, but that does not mean a cold load is offline or makes no third-party requests.

**Fix:** deliberately choose self-hosted/bundled Monaco and workers, declare its version explicitly, and test production asset/worker paths. Self-host fonts or use system fallbacks. Add visible failure handling, retry, and a documented offline policy. A service worker is optional; do not add caching complexity before assets are self-contained.

No evidence was found that application code uploads source, but third-party script execution remains a trust dependency. Do not make an absolute privacy/offline claim without a network test.

### R-02 — P2: strengthen type/lint/test configuration

- Enable `strict` in both appropriate TypeScript projects. The additional strict app check already passed.
- Replace meaningful `any` escape hatches with AST/runtime/trace unions; consider `noUncheckedIndexedAccess` incrementally.
- Add a test TypeScript configuration: current project includes only `src` and `vite.config.ts`; Vitest execution is not a full type check of `tests`.
- Add a formatting check and enforce a consistent style without mixing cleanup into correctness patches.
- Fix the execution effect root cause rather than suppressing the lint warning.
- Make CI lint fail on warnings once the baseline is clean.
- Add one documented `check` workflow combining type checks, tests, lint, and production build.

### R-03 — P2: reproducibility and CI

`package.json` has no supported Node engine declaration, package-manager pin, or runtime version file. The installed Vitest 5 requires a newer Node range than Vite alone; choose a supported common version, preferably a suitable LTS, rather than documenting only Vite's minimum.

Use `npm ci` with the lockfile in clean CI, verify no unmet dependencies, and add a provider-appropriate pipeline for type checking, tests, lint, and build. Add focused browser smoke tests after the core harness exists. Build artifacts must be generated from source, not manually patched.

### R-04 — P2: browser failure containment and deployment

No application error boundary is present. Layout/render failures can blank the workspace even if interpreter errors are caught.

Add a recoverable error boundary around the visualization/workspace, distinguish domain errors from internal failures, and offer reset/retry without losing draft source. Validate Vite base-path behavior for subdirectory deployments, Monaco workers, static cache headers, and production preview.

At the deployment layer, define a tested CSP, referrer policy, HTTPS, and suitable content/security headers. Current inline component styles and external Monaco/fonts must be accounted for before enforcing CSP; do not ship an untested policy that breaks the editor. A dedicated worker reduces UI impact, but source evaluation must not gain `eval`, `Function`, arbitrary host object access, filesystem, or network capabilities.

### R-05 — P2/P3: dependency and privacy hygiene

- Run a consented network vulnerability audit in CI/release tooling; no live CVE conclusions are made in this audit.
- Automate reviewed dependency updates and license checks; prefer compatible fixes, not indiscriminate upgrades.
- Keep traces/source local by default. Never include source, stdout, or variable contents in telemetry without opt-in and a clear policy.
- If trace/program import/export or share links are added, version and validate schemas, cap sizes, reject hostile IDs, and avoid accidental source disclosure in URLs.
- If native compilation is ever introduced, use a separately designed sandbox with CPU/memory/network/filesystem isolation. A normal web server compiling arbitrary uploaded code is not an acceptable extension of this frontend design.

## 12. Documentation and maintainability

The README is still the React/Vite starter README. Replace it with:

1. What Tree-VS does, screenshots, and a small reliable example.
2. Exact supported C++ subset and known unsupported syntax.
3. Explicit interpreter-versus-native-compilation distinction.
4. Setup, supported Node/npm versions, and all checks.
5. Architecture/data-flow overview and trace contract.
6. Controls, shortcuts, root selection, pointer/heap semantics, and accessibility options.
7. Resource limits, error examples, offline/network behavior, and deployment instructions.
8. How to add a preset together with expected semantic results/tests.
9. Contribution guidance and intended project license; no project license file is currently provided.

Consolidate preset types, remove or clearly isolate unused starter `App.css`/assets after checking references, and resolve unused scaffolding. Keep algorithm reference implementations only with a documented role. Move component-injected global style blocks into organized styles/modules where useful; retain the current theme-token foundation. Replace misleading copied comments (“guaranteed,” “identical to”) with actual contracts and assumptions.

Refactor `App.tsx` incrementally into execution, playback, workspace sizing, and view/selection responsibilities **after regression tests exist**. Hooks/reducers are sufficient initially; a global state library is not automatically necessary.

## 13. Test strategy: make success meaningful

### Current gaps

- The interpreter recursion test asserts only no error and trace length; it never checks the sum or stack contents (`tests/interpreter.test.ts:32–54`).
- The deletion test claims multiple cases but exercises only a two-child case (`tree_algorithms.test.ts:52–61`).
- AVL checks only a rotation marker, not the final tree/balance (`71–78`).
- DSU checks step counts rather than actual compression/union invariants (`96–104`).
- Layout's collision test covers one small tree and only same-level circle spacing (`112–133`).
- No UI, camera, shortcut, editor lifecycle, browser, or safety-budget tests exist.

### Required suites

| Suite | Essential assertions |
| --- | --- |
| Lexer | Tokens/spans, escapes, numeric validation, comments, unsupported characters, EOF/unterminated input. |
| Parser | Golden ASTs for supported grammar; precedence; strict rejection; empty statements; declaration disambiguation; progress/depth limits. |
| Evaluator semantics | Short-circuiting, signed division, scope/global policy, output, arity, constructors, pointer identity, null/uninitialized errors. |
| Isolation/safety | Prototype keys, forged pointers, unknown fields, deterministic budgets, output/string limits, call/parse depth, worker cancellation. |
| Preset integration | All selectable presets: expected stdout/results/root/edges and meaningful trace state. |
| Algorithm invariants | BST order, AVL balance/heights, heap ordering/multiset, DSU partition/ranks, Trie exact/prefix behavior, DFS/BFS order. |
| Snapshot integrity | Input immutability, previous-step immutability, frame isolation, stable IDs, delta/checkpoint equivalence if adopted. |
| Layout | Valid references, correct edge connectivity, n-ary/forest support, bounds consistency, skewed/deep inputs, label extents, malformed-graph policy. |
| React components | Current-source Run, initial editor decorations, output plus errors, run states, preset dirty-state handling. |
| Playback | Fake-timer transitions, empty/single event, end/replay, pause/step/scrub, speed, stale result rejection. |
| Camera/input | Anchored zoom math, no refit on state-only events, resize modes, clamping, pointer cleanup, wheel delta behavior. |
| Browser/E2E | Cold editor load, all presets, edited Run/hotkey, keyboard focus, resize, pan/zoom, touch, offline/blocked-CDN, refresh, production base path. |
| Accessibility | axe plus manual keyboard/screen-reader checks; visible focus, names/state, textual alternatives, reduced motion. |

Build reusable stable-tree invariant helpers: unique IDs, valid edges, root parent null, reachability, reciprocal metadata, no cycles/shared ownership where prohibited. Use a different validator for arbitrary/intermediate heaps.

Add seeded randomized/property tests for operation sequences, all four AVL rotations, root replacement, duplicate keys, negative values, empty/singleton inputs, Unicode, and three-or-more-child structures. Keep failing seeds as regressions. Fuzz lexer/parser in externally bounded workers/processes; do not risk hanging the whole suite.

Native C++ differential tests are a later confidence tool for the documented subset: trusted small fixtures, explicit standard/toolchain, deterministic stdout/results, and no reliance on undefined behavior. They do not replace trace/topology assertions.

Coverage is a guide, not the goal. Prioritize branch coverage of safety/semantics and invariants over arbitrary line-percentage targets.

## 14. Recommended target architecture

Keep the existing separation, but strengthen the boundaries:

```text
Editor draft + dirty state
  -> explicit Run request { runId, source, limits, selectedRootBinding }
  -> worker
      -> validated lexer/parser + source spans
      -> supported-feature/type validation
      -> bounded evaluator with tagged values/environments
      -> canonical immutable events + diagnostics
  -> bounded result batches/checkpoints, validated by runId
  -> execution store + playback index
      -> frame/locals/output selectors
      -> heap-to-visualization adapter
          -> tree / forest / intermediate-graph policy
          -> geometry cache
          -> SVG view with independent camera/selection state
```

Important boundaries:

- Runtime memory is not layout data; layout must not change program semantics.
- A trace's source version travels with it.
- Errors retain valid prior output/events and their source positions.
- Core evaluation does not depend on React, theme colors, or variable naming conventions.
- Guided algorithms, if retained, adapt into the same visualization/event contracts without impersonating C++ execution.
- Serialization formats are versioned only when persistence/import/export is introduced; avoid unnecessary public APIs too early.

## 15. Phased implementation roadmap

Effort is relative: **S** = localized change, **M** = multi-file change with tests, **L** = architectural work. These are planning sizes, not promised durations.

### Phase 0 — Establish the truth and block unsafe success

Dependencies: none. Keep patches small and independently reviewable.

- [ ] **I-01 / S–M:** fix prototype-unsafe lookups, pointer/member validation, and add isolation regressions.
- [ ] **M:** add semantic tests for every bundled preset; encode current failures as explicit work items, not silently passing assertions.
- [ ] **I-03, I-04, I-09 / M:** fix short-circuiting, output precedence/single evaluation, `endl`, and supported escapes.
- [ ] **I-05, I-06 / M:** reject invalid bindings/dereferences/lvalues and malformed/unsupported syntax.
- [ ] **M:** gate BFS until its complete required semantics work; correct console/metadata claims and document the initial subset.
- [ ] **R-02 / S:** enable strict app typing and establish a clean lint/type/test/build baseline.

**Exit gate:** no host prototype mutation; no silent unsupported-feature success in covered cases; shipped presets are either semantically correct or explicitly unavailable; known baseline checks pass without ignored warnings.

### Phase 1 — Make tree state and execution lifecycle reliable

Depends on Phase 0 semantic contracts.

- [ ] **I-02 / M–L:** authoritative forward links, explicit root-binding policy, safe intermediate heap projection.
- [ ] **U-01, U-02 / M:** draft/executed source separation and current-source keyboard Run.
- [ ] **U-03, U-05, U-06 / M:** structured errors/markers, playback transitions, accurate stdout/status.
- [ ] **V-01 / M:** camera independent of trace stepping.
- [ ] **I-11 / M:** independent configurable resource limits before broader language support.

**Exit gate:** LL/LR diagrams match executed root/edges; editing does not unexpectedly rerun/reset the trace; hotkey and button run the same visible source; timeline end/error/empty behavior is deterministic; manual camera survives stepping.

### Phase 2 — Execution isolation and maintainable contracts

Depends on stable run/event semantics from Phase 1.

- [ ] **I-11 / L:** worker execution, termination/cancellation, run IDs, bounded messages, stale-result rejection.
- [ ] **I-12 / L:** canonical typed AST/runtime/events/diagnostics, stable frame identities, pointer identity preservation.
- [ ] **I-07, I-08 / M–L:** implement or explicitly reject scope/global/reference/type/numeric behavior according to the published subset.
- [ ] **R-04 / M:** recoverable UI error boundary and retained draft source.
- [ ] **R-01 / M:** self-contained Monaco/runtime assets and tested load failures.

**Exit gate:** adversarial source cannot indefinitely block the UI; Stop/New Run reliably supersedes prior execution; errors are actionable and source-positioned; contracts support exhaustive tests.

### Phase 3 — Fix reusable algorithms and broaden topology safely

Can run partly in parallel with Phase 2 using disjoint files; coordinate shared model changes.

- [ ] **A-01, A-03, A-04 / S–M:** unique IDs, root-parent deletion fix, immutable traversal frames.
- [ ] **A-05, A-06, A-07 / M:** Trie normalization, DSU validation, structural validators and bounded algorithms.
- [ ] **A-02 / L:** explicit n-ary/forest topology adapters and corresponding layout/render tests.
- [ ] **A-08, A-09, A-10 / M:** depth policy/iterative paths, consistent bounds, input/comparator contracts.
- [ ] **M:** decide and document guided-mode versus reference-only role; consolidate preset types accordingly.

**Exit gate:** chained operations preserve invariants; every Trie/DSU relation is visible; malformed stable inputs fail clearly; published depth/size limits are tested.

### Phase 4 — Usable across input methods and screen sizes

Depends on reliable view/camera state; can overlap non-conflicting core work.

- [ ] **V-02, V-03 / M:** resize-aware camera, anchored toolbar zoom, pointer capture and wheel policy.
- [ ] **U-04 / S–M:** focus-safe keyboard shortcuts.
- [ ] **M:** accessible controls/tabs/splitters/tree alternative and responsive workspace.
- [ ] **U-07 / M:** locals/selected-frame/node inspection and honest pointer states.
- [ ] **M:** browser, accessibility, touch, and blocked-network smoke suites.

**Exit gate:** keyboard-only operation works; no inappropriate shortcut capture; useful layout on narrow/short screens and at 200% zoom; camera behavior is predictable under resize and touch.

### Phase 5 — Measured scaling and release readiness

Depends on benchmark harness and stable contracts.

- [ ] **M:** profile realistic scenes, set published budgets, optimize repeated layout/render work.
- [ ] **L, only if needed:** deltas/checkpoints/structural sharing with equivalence and seek-latency tests.
- [ ] **R-03, R-05 / M:** clean-install CI, dependency/license checks, supported runtimes, production deployment smoke tests.
- [ ] **M:** replace README, document architecture/subset/limits/privacy/deployment, resolve starter scaffolding and license decision.
- [ ] **V-04 / S–M:** intentional states/legend/coordinated motion with reduced-motion support.

**Exit gate:** reproducible release checks, measured supported limits, tested static deployment/editor workers, clear documentation, and no known open P0/P1 defects in shipped functionality.

## 16. Optional enhancements after reliability

These are product choices, not prerequisites to fixing the application.

### High-value learning/debugging features

- Step Into / Over / Out, breakpoints, run-to-line, and event-type filtering.
- Watch expressions restricted to side-effect-free supported evaluation.
- Highlight the exact changed pointer/value/edge between adjacent events.
- Select a root binding or frame and explain aliases by allocation ID.
- Reachability/orphaned-allocation view, and explicit `delete`/use-after-free diagnostics if memory-lifetime support is added.
- Queue/stack/heap-array panels when backed by real runtime values, especially for BFS.
- Test-case input forms for code-first programs, keeping inputs separate from implementation.
- Compare recursive/iterative algorithms, balanced/skewed cases, and algorithm complexity versus visualizer overhead.
- More fixtures: RR/RL rotations, empty/singleton trees, duplicate keys, negative values, missing targets, root deletion, and invalid input demonstrations.

### Workflow improvements

- Local draft persistence with schema version, storage failure handling, explicit clear, and per-preset dirty state.
- Import/export `.cpp`, copy output, and image/SVG export with safe serialization.
- Versioned trace export for reproducible bug reports, with privacy warnings and size caps.
- Searchable preset catalog, beginner guidance, shortcut help, adjustable font size, and high-contrast/theme choices.
- Opt-in share links only after deciding whether source belongs in the URL or a storage service; make disclosure clear.

### Long-term execution choice

**Recommended near term:** repair and document the custom subset interpreter. It already gives fine-grained trace control and works without a server.

If users need broad real-C++ compatibility, evaluate alternatives separately:

| Option | Advantage | Cost/risk |
| --- | --- | --- |
| Hardened custom subset | Small, local, controllable educational traces | Ongoing semantic maintenance; must reject unsupported C++. |
| Compiler/AST tooling or instrumented WebAssembly | Better language fidelity and potential local execution | Larger toolchain, loading costs, source mapping, and memory/trace instrumentation remain substantial work. A compiler alone does not produce tree visualizations. |
| Sandboxed remote native runner | Broad toolchain compatibility | Server cost, latency, code privacy, abuse controls, and strong isolation requirements. |

Do not promise full C++ merely by swapping parsers. The runtime, memory model, diagnostics, instrumentation, safety model, and trace mapping all need a deliberate design.

## 17. Overall definition of done

A dependable first release should meet all of these:

- Every selectable example has a verified semantic outcome, not just a non-empty trace.
- Supported programs follow the documented subset; unsupported or invalid ones fail explicitly at useful source locations.
- No interpreted string/identifier can access or modify host prototypes/objects.
- Execution and parsing are bounded; cancellation does not depend on a responsive interpreter loop.
- Root, pointer identities, tree edges, frame state, and stdout agree at each defined event boundary.
- Historical snapshots do not change retroactively.
- Editor draft, executed source, playback, camera, and selection are independently understandable states.
- Keyboard, touch, resize, narrow screens, and assistive technologies have tested usable paths.
- Clean-install checks and deployment are reproducible, runtime assets are deliberate, and README claims match reality.

**Bottom line:** preserve the current project structure and visual direction, but invest first in a trustworthy execution model and observable contracts. That work makes every later visual or educational feature safer and easier to build.
