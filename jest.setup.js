/**
 * jest.setup.js
 *
 * Loads the pure-domain TypeScript source files into Jest's global scope so
 * that test files can reference PaScoreService, PaService, PaState, etc.
 * without any import statements (mirroring the GAS global-namespace model).
 *
 * Strategy
 * --------
 * 1. Compile each .ts file to ES5 using the TypeScript compiler API with
 *    `module: none`.  ES5 output uses `var` for class/enum declarations.
 * 2. Execute the compiled code inside a `new Function` to keep it in an
 *    isolated scope, then explicitly copy named symbols onto `global`.
 *    This avoids the vm.Script / sandboxed-context mismatch that Jest creates.
 *
 * Files containing GAS API calls are intentionally excluded. All domain files
 * loaded here are GAS-free and require no global stubs.
 */

const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

// ── TypeScript compiler options ────────────────────────────────────────────────
const compilerOptions = {
  module: ts.ModuleKind.None, // no module wrapper — plain script output
  target: ts.ScriptTarget.ES5, // ES5: classes → var X = (function(){…})()
  experimentalDecorators: true,
  noImplicitAny: false,
  strict: false,
};

/**
 * Compiles a TypeScript source file, executes it inside a `new Function` body
 * (giving it its own scope so inner vars don't leak), then copies each named
 * symbol from `symbolNames` onto `global` so Jest test files can access them.
 *
 * @param {string}   relPath     - Path relative to the workspace root.
 * @param {string[]} symbolNames - Names of classes/enums to expose globally.
 *                                 Pass [] for interface-only files (no runtime output).
 */
function loadTS(relPath, symbolNames = []) {
  const src = fs.readFileSync(path.join(ROOT, relPath), "utf8");
  const { outputText } = ts.transpileModule(src, { compilerOptions });

  if (symbolNames.length === 0) return; // nothing to expose — skip execution

  // Append explicit assignments to the shared `out` object for each known symbol.
  const assignments = symbolNames
    .map((name) => `try { out["${name}"] = ${name}; } catch (_) {}`)
    .join("\n");

  const out = {};
  // eslint-disable-next-line no-new-func
  new Function("global", "out", outputText + "\n" + assignments)(global, out);

  for (const [name, val] of Object.entries(out)) {
    global[name] = val;
  }
}

// ── Load source files in dependency order ─────────────────────────────────────
// Interface/type-only files (Student, Project, Row, …) compile to empty output;
// they are omitted — only files with runtime symbols need loading.
loadTS("domain/entities/pa-state.ts", ["PaState"]);
loadTS("shared/util.ts", [
  "generateRandomKey",
  "generateUniqueKey",
  "fillWithUnderScore",
]);
loadTS("domain/services/PaScoreService.ts", ["PaScoreService"]);
loadTS("application/services/PaService.ts", ["PaService"]);
