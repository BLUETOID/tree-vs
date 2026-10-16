import { describe, it, expect } from 'vitest';
import { runCppTreeInterpreter } from '../src/core/interpreter';

describe('C++ Interpreter Semantics & Edge Cases', () => {
  it('correctly prioritizes arithmetic over stream shift (cout << 1 + 2)', () => {
    const code = `
      #include <iostream>
      using namespace std;
      int main() {
        cout << 1 + 2;
      }
    `;
    const result = runCppTreeInterpreter(code);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toBe('3');
  });

  it('correctly handles endl and string escape sequences', () => {
    const code = `
      #include <iostream>
      using namespace std;
      int main() {
        cout << "Line1\\nLine2" << endl;
      }
    `;
    const result = runCppTreeInterpreter(code);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toBe('Line1\nLine2\n');
  });

  it('short-circuits && so RHS side-effects do not run when LHS is false', () => {
    const code = `
      #include <iostream>
      using namespace std;
      int sideEffect() {
        cout << "BAD";
        return 1;
      }
      int main() {
        bool x = false && sideEffect();
      }
    `;
    const result = runCppTreeInterpreter(code);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toBe('');
  });

  it('short-circuits || so RHS side-effects do not run when LHS is true', () => {
    const code = `
      #include <iostream>
      using namespace std;
      int sideEffect() {
        cout << "BAD";
        return 1;
      }
      int main() {
        bool x = true || sideEffect();
      }
    `;
    const result = runCppTreeInterpreter(code);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toBe('');
  });

  it('truncates integer division toward zero', () => {
    const code = `
      #include <iostream>
      using namespace std;
      int main() {
        int a = (0 - 3) / 2;
        cout << a;
      }
    `;
    const result = runCppTreeInterpreter(code);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toBe('-1');
  });

  it('reports division by zero as an educational diagnostic', () => {
    const code = `
      #include <iostream>
      using namespace std;
      int main() {
        int a = 10 / 0;
      }
    `;
    const result = runCppTreeInterpreter(code);
    expect(result.error).toContain('Division by zero');
  });

  it('catches null pointer dereference with line diagnostic', () => {
    const code = `
      #include <iostream>
      using namespace std;
      int main() {
        TreeNode* p = nullptr;
        cout << p->val;
      }
    `;
    const result = runCppTreeInterpreter(code);
    expect(result.error).toContain('Null pointer dereference');
  });

  it('handles empty statements (;) cleanly', () => {
    const code = `
      #include <iostream>
      using namespace std;
      int main() {
        if (true);
        int x = 5;
        ;
        cout << x;
      }
    `;
    const result = runCppTreeInterpreter(code);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toBe('5');
  });

  it('supports queue operations and member calls for BFS', () => {
    const code = `
      #include <iostream>
      #include <queue>
      using namespace std;
      int main() {
        queue<int> q;
        q.push(10);
        q.push(20);
        cout << q.front() << " ";
        q.pop();
        cout << q.front() << " ";
        cout << (q.empty() ? "empty" : "not-empty");
      }
    `;
    const result = runCppTreeInterpreter(code);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toBe('10 20 not-empty');
  });
});
