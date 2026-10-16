import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const run = (cmd, args = []) => {
  const r = spawnSync(cmd, args, { cwd: process.cwd(), encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 4 * 1024 * 1024 });
  if (r.error) return { code: 1, out: '', err: r.error.message };
  return { code: r.status ?? 1, out: r.stdout || '', err: r.stderr || '' };
};
const git = (...args) => run('git', args);
const exists = file => fs.existsSync(path.resolve(process.cwd(), file));
const confirm = async (ask, message) => (await ask(message + ' Type "yes" to continue: ')).toLowerCase() === 'yes';
const show = result => {
  if (result.out.trim()) console.log(result.out.trimEnd());
  if (result.err.trim()) console.error(result.err.trimEnd());
  return result.code === 0;
};
function checkCommand() {
  if (exists('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      if (pkg.scripts?.test) return ['npm', ['test']];
      if (pkg.scripts?.build) return ['npm', ['run', 'build']];
    } catch {}
  }
  if (exists('go.mod')) return ['go', ['test', './...']];
  if (exists('Cargo.toml')) return ['cargo', ['test']];
  if (exists('pyproject.toml')) return ['python', ['-m', 'pytest']];
  if (exists('pom.xml')) return ['mvn', ['test']];
  if (exists('build.gradle') || exists('build.gradle.kts')) return ['gradle', ['test']];
  return null;
}
async function ship(ask, message) {
  if (git('rev-parse', '--is-inside-work-tree').code !== 0) throw new Error('Run devpilot ship inside a Git repository.');
  const status = git('status', '--short');
  if (status.code !== 0) throw new Error('Could not read Git status.');
  if (!status.out.trim()) { console.log('Working tree is clean. Nothing to ship.'); return true; }
  console.log('SHIP CHECKLIST\n--------------\n' + status.out.trimEnd());
  for (const args of [['diff', '--check'], ['diff', '--cached', '--check']]) {
    const check = git(...args);
    if (check.code !== 0) { show(check); throw new Error('Git whitespace check failed.'); }
  }
  console.log('[ok] Git whitespace checks');
  const check = checkCommand();
  if (check) {
    console.log('Running verification: ' + check[0] + ' ' + check[1].join(' '));
    const result = run(check[0], check[1]);
    show(result);
    if (result.code !== 0) throw new Error('Verification failed. Fix it before shipping.');
    console.log('[ok] Verification passed');
  } else if (!await confirm(ask, 'No test/build script found. Continue without automated verification?')) {
    console.log('Ship cancelled.'); return true;
  }
  if (!await confirm(ask, 'Stage all non-ignored changes? Review the file list above first.')) { console.log('Ship cancelled.'); return true; }
  const staged = git('add', '-A');
  if (!show(staged)) throw new Error('Could not stage changes.');
  const stagedWhitespace = git('diff', '--cached', '--check');
  if (stagedWhitespace.code !== 0) { show(stagedWhitespace); throw new Error('Staged whitespace check failed. Nothing was committed or pushed.'); }
  const names = git('diff', '--cached', '--name-only');
  if (names.code !== 0) throw new Error('Could not inspect staged files.');
  for (const name of names.out.split(/\r?\n/).filter(Boolean)) {
    const base = path.basename(name).toLowerCase();
    if (base === '.env' || (base.startsWith('.env.') && base !== '.env.example') || /\.pem$/i.test(name) || base.includes('id_rsa') || base.includes('private_key')) {
      throw new Error('Potential secret file staged: ' + name + '. Nothing was committed or pushed; inspect and unstage it.');
    }
  }
  if (/-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(git('diff', '--cached').out)) throw new Error('Potential private key detected in staged diff. Nothing was committed or pushed.');
  console.log('Staged files:\n' + names.out.trimEnd());
  const msg = (message || await ask('Commit message: ')).trim();
  if (!msg) throw new Error('A commit message is required.');
  if (!await confirm(ask, 'Create commit "' + msg + '"?')) { console.log('Commit cancelled; changes remain staged.'); return true; }
  const committed = git('commit', '-m', msg);
  if (!show(committed)) throw new Error('Commit failed.');
  if (!await confirm(ask, 'Push this commit to the current upstream branch?')) { console.log('Committed locally. Push skipped.'); return true; }
  const pushed = git('push');
  show(pushed);
  if (pushed.code !== 0) throw new Error('Push failed; your commit remains saved locally.');
  console.log('Shipped successfully.');
  return true;
}
function doctor() {
  console.log('DEVPILOT DOCTOR\n--------------');
  const root = git('rev-parse', '--show-toplevel');
  if (root.code === 0) {
    console.log('[ok] Git repository: ' + root.out.trim());
    const branch = git('branch', '--show-current');
    if (branch.code === 0) console.log('[ok] Branch: ' + branch.out.trim());
    const status = git('status', '--short');
    if (status.code === 0) console.log(status.out.trim() ? '[warn] Uncommitted changes:\n' + status.out.trimEnd() : '[ok] Working tree clean');
    if (git('rev-parse', '--abbrev-ref', '@{upstream}').code !== 0) console.log('[warn] Current branch has no configured upstream.');
  } else console.log('[warn] Not inside a Git repository.');
  for (const tool of ['git', 'gh', 'node', 'npm', 'go', 'python', 'cargo', 'mvn', 'gradle']) {
    const result = run(process.platform === 'win32' ? 'where' : 'which', [tool]);
    console.log(result.code === 0 ? '[ok] ' + tool + ': ' + result.out.trim().split(/\r?\n/)[0] : '[--] ' + tool + ' not found (optional unless required)');
  }
  const manifests = ['package.json', 'go.mod', 'pyproject.toml', 'requirements.txt', 'Cargo.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts'].filter(exists);
  console.log(manifests.length ? 'Project manifests: ' + manifests.join(', ') : 'No common project manifest in this directory.');
  if (exists('.env')) console.log('[warn] .env exists locally; ensure it is ignored and never committed.');
  console.log('Doctor does not install packages or modify files.');
}
function resume() {
  const branch = git('branch', '--show-current');
  if (branch.code !== 0 || !branch.out.trim()) throw new Error('Run devpilot resume inside a Git repository.');
  console.log('RESUME SESSION\n--------------\nBranch: ' + branch.out.trim());
  for (const [label, args] of [['Working tree', ['status', '--short', '--branch']], ['Recent commits', ['log', '-5', '--date=relative', '--pretty=format:%h  %s (%ar)']], ['Stashes', ['stash', 'list', '-5']], ['Changed files', ['diff', '--name-only']]]) {
    const result = git(...args);
    if (result.code === 0 && result.out.trim()) console.log('\n' + label + ':\n' + result.out.trimEnd());
  }
  console.log('\nNext: devpilot review --diff, devpilot test, or devpilot ship.');
}
function daily() {
  const log = git('log', '--since=24 hours ago', '--date=short', '--pretty=format:%h %ad %s');
  if (log.code !== 0) throw new Error('Run devpilot daily inside a Git repository.');
  console.log('DAILY DEVELOPER BRIEF\n---------------------\n' + (log.out.trim() ? 'Commits in the last 24 hours:\n' + log.out.trimEnd() : 'No commits in the last 24 hours.'));
  const status = git('status', '--short');
  if (status.code === 0) console.log('\n' + (status.out.trim() ? 'Uncommitted work:\n' + status.out.trimEnd() : 'Working tree: clean'));
  const branch = git('branch', '--show-current');
  if (branch.code === 0) console.log('\nCurrent branch: ' + branch.out.trim());
}
function pulse() {
  const branch = git('branch', '--show-current');
  if (branch.code !== 0 || !branch.out.trim()) throw new Error('Run devpilot pulse inside a Git repository.');
  const status = git('status', '--short'), commits = git('rev-list', '--count', '--since=7 days ago', 'HEAD'), files = git('diff', '--name-only');
  console.log('PROJECT PULSE\n-------------\nBranch: ' + branch.out.trim() + '\nCommits (last 7 days): ' + (commits.out.trim() || '0'));
  console.log(status.out.trim() ? 'Working tree changes:\n' + status.out.trimEnd() : 'Working tree: clean');
  console.log(files.out.trim() ? 'Unstaged changed files:\n' + files.out.trimEnd() : 'Unstaged changed files: none');
}
async function commit(ask) {
  const staged = git('diff', '--cached', '--stat');
  if (staged.code !== 0) throw new Error('Could not read staged changes.');
  if (!staged.out.trim()) { console.log('Nothing is staged. Stage only intended files with git add <file>, then retry.'); return true; }
  console.log('Staged changes:\n' + staged.out.trimEnd());
  const message = (await ask('Commit message [feat: update project]: ')) || 'feat: update project';
  if (!await confirm(ask, 'Commit staged changes as "' + message + '"?')) { console.log('Commit cancelled.'); return true; }
  const result = git('commit', '-m', message);
  show(result);
  if (result.code !== 0) throw new Error('Commit failed.');
  return true;
}
export async function runProductivity(args, { ask }) {
  const [command, ...rest] = args;
  if (command === 'ship') return ship(ask, rest.join(' '));
  if (command === 'doctor') { doctor(); return true; }
  if (command === 'resume') { resume(); return true; }
  if (command === 'daily') { daily(); return true; }
  if (command === 'pulse') { pulse(); return true; }
  if (command === 'commit') return commit(ask);
  if (command === 'coffee') { console.log('Coffee acquired. Bugs fear a developer with caffeine.'); return true; }
  if (command === 'matrix') { console.log('Wake up, developer...\n  01000100 01100101 01110110 01010000 01101001 01101100 01101111 01110100\n  Follow the diff. Trust the tests. Question every green check.'); return true; }
  if (command === 'motivate') {
    const lines = ['Small commits. Clear diffs. Shipped software.', 'Every expert was once confused by a compiler error.', 'Make it work. Make it clear. Then make it fast.', 'One tested improvement beats ten unfinished rewrites.'];
    console.log(lines[Math.floor(Date.now() / 1000) % lines.length]); return true;
  }
  return false;
}
