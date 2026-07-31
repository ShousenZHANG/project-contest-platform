const fs = require('fs');
const path = require('path');

/**
 * Every URL the frontend calls must exist on a backend controller.
 *
 * This repo has already shipped a service module whose methods pointed at routes
 * that had never existed — it was deleted rather than fixed, because nothing
 * called it. The check that found it was a manual sweep, and a manual sweep only
 * holds until the next endpoint is renamed. This is that sweep, automated.
 *
 * It reads the Java controllers directly rather than an OpenAPI dump, so it
 * cannot go stale against a spec nobody regenerated.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SERVICES_DIR = path.resolve(__dirname, '../services');
const BACKEND_DIR = path.join(REPO_ROOT, 'backend');

const MAPPINGS = {
  GetMapping: 'get',
  PostMapping: 'post',
  PutMapping: 'put',
  DeleteMapping: 'delete',
  PatchMapping: 'patch',
};

function walk(dir, filter) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, filter));
    else if (filter(entry.name)) out.push(full);
  }
  return out;
}

/** `${id}` and `{id}` are both "some value here" — compare shapes, not names. */
function normalise(route) {
  return (
    route
      .replace(/\$\{[^}]*\}/g, '*')
      .replace(/\{[^}]*\}/g, '*')
      .split('?')[0]
      .replace(/\/$/, '') || '/'
  );
}

function backendEndpoints() {
  const controllers = walk(BACKEND_DIR, (n) => n.endsWith('.java')).filter((f) =>
    f.includes(`${path.sep}controller${path.sep}`)
  );

  const endpoints = new Set();
  for (const file of controllers) {
    const source = fs.readFileSync(file, 'utf-8');
    const base = source.match(/@RequestMapping\(\s*"([^"]*)"/)?.[1] ?? '';

    for (const [annotation, verb] of Object.entries(MAPPINGS)) {
      const pattern = new RegExp(`@${annotation}(?:\\(\\s*(?:value\\s*=\\s*)?"([^"]*)")?`, 'g');
      for (const match of source.matchAll(pattern)) {
        endpoints.add(`${verb} ${normalise(base + (match[1] ?? ''))}`);
      }
    }
  }
  return endpoints;
}

function frontendCalls() {
  const modules = walk(SERVICES_DIR, (n) => /\.(js|ts)$/.test(n)).filter(
    (f) => !f.includes('__tests__')
  );

  const calls = [];
  for (const file of modules) {
    const source = fs.readFileSync(file, 'utf-8');
    const pattern = /\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)/g;
    for (const match of source.matchAll(pattern)) {
      calls.push({
        verb: match[1],
        route: match[2],
        key: `${match[1]} ${normalise(match[2])}`,
        module: path.basename(file),
      });
    }
  }
  return calls;
}

describe('every service route exists on the backend', () => {
  const endpoints = backendEndpoints();
  const calls = frontendCalls();

  it('finds controllers and service modules to compare', () => {
    expect(endpoints.size).toBeGreaterThan(50);
    expect(calls.length).toBeGreaterThan(50);
  });

  it('has no service method pointing at a route that does not exist', () => {
    // Asserted as a list rather than a count so a failure names the offenders
    // instead of saying "expected 0, got 3".
    const orphans = calls
      .filter((c) => !endpoints.has(c.key))
      .map((c) => `${c.module}: ${c.verb.toUpperCase()} ${c.route}`);

    expect(orphans).toEqual([]);
  });
});
