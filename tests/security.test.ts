import { describe, it, expect } from 'vitest';
import { runCppTreeInterpreter } from '../src/core/interpreter';

describe('Security & Isolation (P0 Prototype Pollution)', () => {
  it('cannot pollute host Object.prototype via string pointer or member writes', () => {
    const maliciousCode = `
      #include <iostream>
      using namespace std;
      int main() {
        string p = "__proto__";
        p->val = 123;
      }
    `;

    runCppTreeInterpreter(maliciousCode);
    // Should fail or reject, but NEVER pollute Object.prototype
    expect((Object.prototype as any).val).toBeUndefined();
    expect((Object.prototype as any).__treevsAuditMarker).toBeUndefined();
  });

  it('rejects access to constructor or prototype properties', () => {
    const code = `
      #include <iostream>
      using namespace std;
      int main() {
        TreeNode* p = new TreeNode(10);
        p->constructor = 999;
      }
    `;

    const result = runCppTreeInterpreter(code);
    expect(result.error).toBeDefined();
    expect((Object.prototype as any).constructor).toBe(Object);
  });
});
