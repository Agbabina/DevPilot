import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runProductivity } from './productivity.mjs';

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: process.cwd(), encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 4 * 1024 * 1024 });
  if (r.error) throw new Error('Could not run ' + cmd + ': ' + r.error.message);
  return { code: r.status ?? 1, out: r.stdout || '', err: r.stderr || '' };
};
const show = r => { if (r.out.trim()) console.log(r.out.trimEnd()); if (r.err.trim()) console.error(r.err.trimEnd()); return r.code === 0; };
const git = (...args) => run('git', args);
const exists = p => fs.existsSync(path.resolve(process.cwd(), p));
const read = p => fs.readFileSync(p, 'utf8');
const askConfirm = async (ask, msg) => (await ask(msg + ' Type "yes" to continue: ')).toLowerCase() === 'yes';
const gh = (...args) => {
  const r = run('gh', args);
  if (/not found|not recognized|ENOENT/i.test(r.err + r.out)) throw new Error('GitHub CLI (gh) is required. Install it and run gh auth login.');
  return r;
};
function files(dir = process.cwd(), out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', 'vendor'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files(p, out);
    else if (e.isFile() && /\.(js|jsx|ts|tsx|mjs|cjs|go|py|java|cs|php|rb|rs|env|yml|yaml|json|toml|sh)$/i.test(e.name)) out.push(p);
    if (out.length >= 3000) break;
  }
  return out;
}
function inspect(securityOnly = false) {
  const rules = securityOnly ? [
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, 'Private key material'],
    [/\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\b/g, 'Token/key-shaped string'],
    [/\b(?:password|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*['"][^'"]{8,}['"]/gi, 'Possible hard-coded credential'],
    [/\b(?:rejectUnauthorized\s*:\s*false|InsecureSkipVerify\s*:\s*true)\b/g, 'TLS verification disabled']
  ] : [
    [/\b(eval|exec)\s*\(/g, 'Review dynamic code execution'],
    [/\b(?:TODO|FIXME|HACK)\b/g, 'Unfinished-work marker'],
    [/\bcatch\s*\([^)]*\)\s*\{\s*\}/g, 'Empty catch block hides errors'],
    [/console\.log\s*\(/g, 'Debug logging']
  ];
  let count = 0;
  const all = files();
  for (const file of all) {
    let lines;
    try { lines = read(file).split(/\r?\n/); } catch { continue; }
    lines.forEach((line, i) => rules.forEach(([re, label]) => {
      re.lastIndex = 0;
      if (re.test(line)) { console.log('[CHECK] ' + path.relative(process.cwd(), file) + ':' + (i + 1) + ' — ' + label); count++; }
    }));
  }
  console.log('\nScanned ' + all.length + ' files; ' + count + ' heuristic finding(s). This is not a full audit.');
}
function impact(file) {
  if (!file) throw new Error('Usage: devpilot impact <file>');
  const r = git('grep', '-n', '-I', '-e', path.basename(file), '--', ':!package-lock.json', ':!*.sum');
  if (r.code === 1) console.log('No tracked text references found for ' + path.basename(file) + '.');
  else show(r);
  console.log('\nAlso check imports, exports, routes, tests, and configuration references.');
}
function dependencies() {
  const items = [['Node', 'package.json', 'npm audit --omit=dev'], ['Go', 'go.mod', 'go vet ./...'], ['Python', 'requirements.txt', 'python -m pip_audit -r requirements.txt'], ['Python', 'pyproject.toml', 'python -m pip_audit'], ['Rust', 'Cargo.toml', 'cargo audit']];
  const found = items.filter(x => exists(x[1]));
  if (!found.length) return console.log('No supported dependency manifest detected.');
  found.forEach(x => console.log('- ' + x[0] + ' (' + x[1] + '): optional check: ' + x[2]));
  console.log('\nNo packages were downloaded or checks run.');
}
function test() {
  let cmd, args;
  if (exists('package.json')) {
    const p = JSON.parse(read('package.json'));
    if (p.scripts?.test) { cmd = 'npm'; args = ['test']; }
    else if (p.scripts?.build) { cmd = 'npm'; args = ['run', 'build']; }
  } else if (exists('go.mod')) { cmd = 'go'; args = ['test', './...']; }
  else if (exists('pyproject.toml') || exists('pytest.ini') || exists('tests')) { cmd = 'python'; args = ['-m', 'pytest']; }
  else if (exists('Cargo.toml')) { cmd = 'cargo'; args = ['test']; }
  else if (exists('pom.xml')) { cmd = 'mvn'; args = ['test']; }
  if (!cmd) throw new Error('No test/build command detected for this project.');
  console.log('Running ' + cmd + ' ' + args.join(' '));
  show(run(cmd, args));
}
async function prDraft() {
  console.log('Suggested PR title:\nfeat: describe the change\n');
  console.log('## Summary\n- What changed and why\n\n## Testing\n- [ ] Tests/build passed\n\n## Risks\n- Note compatibility or migration risks\n');
  console.log('Recent commits:\n' + git('log', '-5', '--oneline').out);
  console.log('Working tree:\n' + (git('status', '--short').out || 'clean'));
}
async function runDevtools(args, { ask, request }) {
  const cmd = args[0], rest = args.slice(1);
  if (await runProductivity(args, { ask })) return true;
  if (cmd === 'pr') {
    const sub = rest[0];
    if (sub === 'draft') return prDraft();
    if (sub === 'create') {
      const title = rest.slice(1).join(' ') || await ask('PR title: ');
      if (!title) throw new Error('PR title required.');
      const body = await ask('PR description (blank uses template): ');
      return show(gh('pr', 'create', '--title', title, '--body', body || '## Summary\n- Describe changes\n\n## Testing\n- [ ] Tests passed'));
    }
    if (sub === 'review') return show(gh('pr', 'diff'));
    if (sub === 'checks') return show(gh('pr', 'checks'));
    if (sub === 'merge') {
      const view = gh('pr', 'view', '--json', 'number,title,state,mergeable,statusCheckRollup');
      if (view.code !== 0) { show(view); throw new Error('Could not inspect PR; ensure gh auth login is complete and a PR exists.'); }
      let details;
      try { details = JSON.parse(view.out); } catch { throw new Error('GitHub CLI returned unreadable PR status.'); }
      console.log('PR #' + details.number + ': ' + details.title + '\\nState: ' + details.state + '\\nMergeability: ' + details.mergeable);
      const checks = details.statusCheckRollup || [];
      const failed = checks.filter(c => ['FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT'].includes(c.conclusion || c.state));
      if (details.state !== 'OPEN') throw new Error('Only an open PR can be merged.');
      if (details.mergeable === false || details.mergeable === 'CONFLICTING') throw new Error('PR has merge conflicts. Resolve them before merging.');
      if (failed.length) throw new Error('PR has failing checks. Fix them before merging.');
      if (!await askConfirm(ask, 'Merge the current PR using squash?')) return console.log('Merge cancelled.');
      return show(gh('pr', 'merge', '--squash', '--delete-branch'));
    }
    throw new Error('Usage: devpilot pr <draft|create|review|merge|checks>');
  }
  if (cmd === 'issue') {
    const title = rest.join(' ') || await ask('Issue title: ');
    if (!title) throw new Error('Issue title required.');
    const body = await ask('Details, expected behaviour, and reproduction steps: ');
    return show(gh('issue', 'create', '--title', title, '--body', body || '## Problem\n\n## Expected behaviour\n\n## Steps to reproduce\n'));
  }
  if (cmd === 'release') {
    const version = rest[0];
    if (!version) throw new Error('Usage: devpilot release v1.2.0');
    console.log('Release notes draft:\n\n' + git('log', '-12', '--pretty=format:%h %s').out);
    if (!await askConfirm(ask, 'Create local annotated tag ' + version + '?')) return console.log('No tag created.');
    return show(git('tag', '-a', version, '-m', 'Release ' + version));
  }
  if (cmd === 'inspect') return inspect(false);
  if (cmd === 'security') return inspect(true);
  if (cmd === 'impact') return impact(rest[0]);
  if (cmd === 'deps') return dependencies();
  if (cmd === 'test') return test();
  if (cmd === 'explain' || cmd === 'fix' || cmd === 'review') {
    let context = rest.join(' ');
    if (cmd === 'review') {
      const a = git('diff').out, b = git('diff', '--cached').out;
      if (!a.trim() && !b.trim()) return console.log('No uncommitted tracked changes to review.');
      context = 'Review these changes for bugs, regressions, and security. Give actionable findings.\nUNSTAGED:\n' + a + '\nSTAGED:\n' + b;
    } else if (cmd === 'explain') {
      if (!context) context = await ask('Question or file path: ');
      if (!context) throw new Error('Usage: devpilot explain <question-or-file>');
      if (exists(context) && fs.statSync(context).isFile()) {
        context = 'Explain this file, its flow, edge cases, and risks: ' + context + '\n\n' + read(context).slice(0, 18000);
      } else {
        context = 'Explain this programming question clearly with a simple example: ' + context;
      }
    } else context = 'Propose a minimal fix for this error; explain the cause and show the patch. Do not edit files automatically.\n' + (context || await ask('Paste error and relevant context: '));
    const result = await request('/ai/assist', { method: 'POST', body: JSON.stringify({ action: cmd === 'fix' ? 'debug' : cmd, context }) });
    console.log(result?.result || JSON.stringify(result, null, 2));
    return true;
  }
  return false;
}
export { runDevtools };
