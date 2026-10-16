#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { spawnSync, spawn } from 'node:child_process';

const CONFIG = path.resolve(process.cwd(), '.devpilot');
const DEFAULT_API = 'http://localhost:3000';

function readConfig() {
  const values = {};
  try {
    for (const line of fs.readFileSync(CONFIG, 'utf8').split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i > 0) values[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  } catch {}
  return values;
}
function writeConfig(values) {
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  const lines = Object.entries(values).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(CONFIG, lines.join('\n') + '\n', { mode: 0o600 });
}
function apiBase() {
  const c = readConfig();
  return (process.env.DEVPILOT_API_URL || c.api_url || DEFAULT_API).replace(/\/+$/, '');
}
function token() {
  return process.env.DEVPILOT_TOKEN || readConfig().token || '';
}
async function request(route, options = {}, authenticated = true) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authenticated) {
    const t = token();
    if (!t) throw new Error('Not logged in. Run: devpilot login');
    headers.Authorization = `Bearer ${t}`;
  }
  let response;
  try {
    response = await fetch(apiBase() + route, { ...options, headers });
  } catch (e) {
    throw new Error(`Cannot reach API at ${apiBase()}. Is the backend running? (${e.message})`);
  }
  const body = await response.text();
  let data;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) {
    if (response.status === 401 && authenticated) throw new Error('401 Unauthorized. Run "devpilot login" again; your saved token may be missing or expired.');
    const message = data?.message || data || response.statusText;
    throw new Error(`API ${response.status}: ${Array.isArray(message) ? message.join(', ') : message}`);
  }
  return data;
}
async function ask(question) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try { return (await rl.question(question)).trim(); } finally { rl.close(); }
}
async function secret(question) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') return ask(question);
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  return await new Promise((resolve, reject) => {
    let value = '';
    const finish = (err) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
      if (err) reject(err); else resolve(value);
    };
    const onData = (chunk) => {
      for (const ch of chunk.toString('utf8')) {
        if (ch === '\r' || ch === '\n') return finish();
        if (ch === '\u0003') return finish(new Error('Cancelled.'));
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else if (ch >= ' ') value += ch;
      }
    };
    stdin.on('data', onData);
  });
}
function printHelp() {
  console.log(`DevPilot CLI

Setup:
  devpilot init
  devpilot login
  devpilot logout
  devpilot whoami
  devpilot status
  devpilot terminal
  devpilot run <program> [args...]
  devpilot open <path-or-url>
  devpilot doctor
  devpilot github login|status|repo|prs

Git (7 commands):
  devpilot git status
  devpilot git branch
  devpilot git log
  devpilot git diff
  devpilot git fetch
  devpilot git pull --confirm
  devpilot git push --confirm

Projects:
  devpilot project list
  devpilot project show <id>
  devpilot project create
  devpilot project delete <id>

Environment:
  DEVPILOT_API_URL   Override API URL
  DEVPILOT_TOKEN     Override saved token`);
}
function run(program, args = [], options = {}) {
  const result = spawnSync(program, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${program} exited with code ${result.status}`);
}
function git(subcommand) {
  const commands = {
    status: ['status', '--short', '--branch'],
    branch: ['branch', '--all'],
    log: ['log', '--oneline', '--decorate', '-15'],
    diff: ['diff', '--'],
    fetch: ['fetch', '--all', '--prune'],
    pull: ['pull', '--ff-only'],
    push: ['push'],
  };
  const args = commands[subcommand];
  if (!args) throw new Error('Use git status|branch|log|diff|fetch|pull|push.');
  if (['pull', 'push'].includes(subcommand)) {
    // Explicit confirmation prevents accidental remote writes.
    console.log('Confirm with: devpilot git ' + subcommand + ' --confirm');
    return;
  }
  run('git', args);
}
function github(subcommand) {
  if (!['login', 'status', 'repo', 'prs'].includes(subcommand)) throw new Error('Use github login|status|repo|prs.');
  const args = subcommand === 'login' ? ['auth', 'login'] :
    subcommand === 'status' ? ['auth', 'status'] :
    subcommand === 'repo' ? ['repo', 'view'] : ['pr', 'list'];
  run('gh', args);
}
async function terminalLoop() {
  console.log('DevPilot terminal — type help or exit.');
  while (true) {
    const line = (await ask('devpilot> ')).trim();
    const [command, subcommand, ...args] = line.split(/\\s+/).filter(Boolean);
    if (!command) continue;
    if (['exit', 'quit'].includes(command)) return;
    if (command === 'help') console.log('Commands: git <status|branch|log|diff|fetch>, github <status|login|repo|prs>, doctor, exit');
    else if (command === 'git') git(subcommand);
    else if (command === 'github') github(subcommand);
    else if (command === 'doctor') doctor();
    else console.log('Unknown terminal command. Type help.');
  }
}
function doctor() {
  for (const [name, args] of [['node', ['--version']], ['git', ['--version']], ['gh', ['--version']]]) {
    try { console.log('\\n' + name + ':'); run(name, args); }
    catch { console.log(name + ': not installed or failed'); }
  }
  try { console.log('\\nGitHub authentication:'); run('gh', ['auth', 'status']); }
  catch { console.log('GitHub is not authenticated. Run devpilot github login.'); }
  console.log('\\nDevPilot API URL: ' + apiBase());
  console.log('DevPilot token: ' + (token() ? 'configured (hidden)' : 'missing; run devpilot login'));
}
function openTarget(target) {
  if (!target) throw new Error('Usage: devpilot open <path-or-url>');
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', target] : [target];
  const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: false });
  child.on('error', (error) => console.error('Could not open target:', error.message));
  child.unref();
}
async function main(args) {
  const [command, subcommand, ...rest] = args;
  if (!command || command === 'help' || command === '--help' || command === '-h') return printHelp();

  if (command === 'init') {
    const current = readConfig();
    writeConfig({ api_url: current.api_url || DEFAULT_API, ...(current.token ? { token: current.token } : {}) });
    console.log(`Initialized DevPilot in ${process.cwd()}\nAPI: ${apiBase()}`);
    return;
  }
  if (command === 'login') {
    const email = await ask('Email: ');
    const password = await secret('Password: ');
    if (!email || !password) throw new Error('Email and password are required.');
    const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
    if (!result?.accessToken) throw new Error('Login response did not contain accessToken.');
    writeConfig({ ...readConfig(), api_url: apiBase(), token: result.accessToken });
    console.log(`Logged in as ${result.user?.email || email}. Token saved in .devpilot.`);
    return;
  }
  if (command === 'logout') {
    const c = readConfig(); delete c.token; writeConfig(c);
    console.log('Logged out.'); return;
  }
  if (command === 'whoami') {
    const user = await request('/auth/me');
    console.log(`${user.username} <${user.email}> | Level ${user.level} | XP ${user.totalXp}`);
    return;
  }
  if (command === 'status') {
    const user = await request('/auth/me');
    console.log(`Signed in: ${user.username}\nAPI: ${apiBase()}\nLevel: ${user.level} | XP: ${user.totalXp} | Coins: ${user.coins}`);
    return;
  }
  if (command === 'git') {
    const sub = subcommand;
    if (['pull', 'push'].includes(sub)) {
      if (rest[0] !== '--confirm') throw new Error('Remote write not run. Re-run with --confirm.');
      run('git', [sub]);
    } else git(sub);
    return;
  }
  if (command === 'github') { 
    try { github(subcommand); } catch (error) {
      if (error.code === 'ENOENT') throw new Error('Install GitHub CLI (gh) from https://cli.github.com/ for real GitHub authentication.');
      throw error;
    }
    return;
  }
  if (command === 'terminal') { await terminalLoop(); return; }
  if (command === 'run') {
    if (!subcommand) throw new Error('Usage: devpilot run <program> [args...]');
    run(subcommand, rest);
    return;
  }
  if (command === 'open') { openTarget(subcommand); return; }
  if (command === 'doctor') { doctor(); return; }
  if (command === 'project') {
    if (subcommand === 'list') {
      const projects = await request('/projects');
      if (!Array.isArray(projects) || projects.length === 0) return console.log('No projects yet.');
      for (const p of projects) console.log(`#${p.id}  ${p.name}  [${p.status || 'PLANNED'}]  ${p.progress ?? 0}%`);
      return;
    }
    if (subcommand === 'show') {
      if (!rest[0]) throw new Error('Usage: devpilot project show <id>');
      const p = await request(`/projects/${encodeURIComponent(rest[0])}`);
      console.log(JSON.stringify(p, null, 2)); return;
    }
    if (subcommand === 'delete') {
      if (!rest[0]) throw new Error('Usage: devpilot project delete <id>');
      await request(`/projects/${encodeURIComponent(rest[0])}`, { method: 'DELETE' });
      console.log('Project deleted.'); return;
    }
    if (subcommand === 'create') {
      const name = await ask('Project name: ');
      if (!name) throw new Error('Project name is required.');
      const description = await ask('Description: ');
      const priorityInput = (await ask('Priority (LOW, MEDIUM, HIGH) [MEDIUM]: ')).toUpperCase() || 'MEDIUM';
      if (!['LOW', 'MEDIUM', 'HIGH'].includes(priorityInput)) throw new Error('Priority must be LOW, MEDIUM, or HIGH.');
      const xpInput = await ask('XP reward [100]: ');
      const xpReward = xpInput ? Number(xpInput) : 100;
      if (!Number.isInteger(xpReward) || xpReward < 0 || xpReward > 1000000) throw new Error('XP reward must be a non-negative whole number.');
      const githubUrl = await ask('GitHub repository URL (optional): ');
      const payload = { name, priority: priorityInput, xpReward };
      if (description) payload.description = description;
      if (githubUrl && githubUrl.toLowerCase() !== 'optional') payload.githubUrl = githubUrl;
      const created = await request('/projects', { method: 'POST', body: JSON.stringify(payload) });
      console.log(`Created project #${created.id}: ${created.name}`);
      return;
    }
  }
  throw new Error(`Unknown command: ${[command, subcommand].filter(Boolean).join(' ')}\nRun "devpilot --help" for available commands.`);
}
main(process.argv.slice(2)).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
