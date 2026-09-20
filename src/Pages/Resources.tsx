import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileCode2, FileText, Link2, Plus, Search, Trash2, X, type LucideIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Header from '../Component/Header';
import Sidebar from '../Component/Sidebar';
import api from '../services/api';
type Resource = {
  id: number;
  title: string;
  content: string;
  type: string;
  tags: string[] | null;
  createdAt: string;
};
export default function Resources() {
  const [items, setItems] = useState<Resource[]>([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'NOTE',
    tags: '',
  });
  useEffect(() => {
    api
      .get<Resource[]>('/resources')
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, []);
  const filtered = useMemo(
    () =>
      items.filter((i) =>
        (typeFilter === 'ALL' || i.type === typeFilter) &&
        `${i.title} ${i.content} ${(i.tags ?? []).join(' ')}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [items, query, typeFilter]
  );
  const types = ['ALL', ...Array.from(new Set(items.map((item) => item.type)))];
  const stats: Array<{ label: string; value: number; Icon: LucideIcon }> = [
    { label: 'Total resources', value: items.length, Icon: BookOpen },
    { label: 'Snippets', value: items.filter((item) => item.type === 'SNIPPET').length, Icon: FileCode2 },
    { label: 'Topics', value: new Set(items.flatMap((item) => item.tags ?? [])).size, Icon: Link2 },
  ];
  const typeIcon = (type: string) =>
    type === 'SNIPPET' ? <FileCode2 size={16} /> : type === 'REFERENCE' ? <Link2 size={16} /> : <FileText size={16} />;

  function insertSlashCommand(textarea: HTMLTextAreaElement) {
    const value = textarea.value;
    const cursor = textarea.selectionStart;

    const beforeCursor = value.slice(0, cursor);
    const currentLine = beforeCursor.split('\n').pop() ?? '';

    const commands: Record<string, string> = {
      '/h1': '# ',
      '/h2': '## ',
      '/h3': '### ',
      '/quote': '> ',
      '/bullet': '- ',
      '/number': '1. ',
      '/todo': '- [ ] ',
      '/italic': '*italic text*',
      '/bold': '**bold text**',
      '/link': '[link text](https://example.com)',
      '/image': '![image description](https://example.com/image.jpg)',
      '/code': '```javascript\n\n```',
    };

    const codeCommand = currentLine.match(/^\/code-([a-z0-9+#-]+)$/i);

    const command = codeCommand
      ? `\`\`\`${codeCommand[1]}\n\n\`\`\``
      : commands[currentLine];

    if (!command) {
      setForm((previous) => ({
        ...previous,
        content: value,
      }));

      return;
    }

    const commandStart = cursor - currentLine.length;

    const newValue =
      value.slice(0, commandStart) + command + value.slice(cursor);

    setForm((previous) => ({
      ...previous,
      content: newValue,
    }));

    requestAnimationFrame(() => {
      textarea.focus();

      let cursorOffset = command.length;

      // Put the cursor inside the code block.
      if (currentLine === '/code') {
        cursorOffset = command.indexOf('\n') + 1;
      }

      // Put the cursor inside link text.
      if (currentLine === '/link') {
        cursorOffset = 1;
      }

      // Put the cursor inside image alt text.
      if (currentLine === '/image') {
        cursorOffset = 2;
      }

      textarea.setSelectionRange(
        commandStart + cursorOffset,
        commandStart + cursorOffset
      );
    });
  }

  function renderMarkdown(content: string) {
    return (
      <ReactMarkdown
        components={{
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-600 underline hover:text-cyan-500"
                {...props}
              >
                {children}
              </a>
            );
          },
          img({ src, alt }) {
            return (
              <img
                src={src}
                alt={alt ?? ''}
                className="my-3 max-h-80 max-w-full rounded-xl object-contain"
              />
            );
          },
          code({ className, children, ...props }) {
            const match = /language-([\w+#-]+)/.exec(className ?? '');

            return match ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                className="rounded-xl"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code
                className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await api.post<Resource>('/resources', {
      ...form,
      tags: form.tags
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    });
    setItems([r.data, ...items]);
    setForm({ title: '', content: '', type: 'NOTE', tags: '' });
    setShow(false);
  }
  async function remove(id: number) {
    await api.delete(`/resources/${id}`);
    setItems(items.filter((i) => i.id !== id));
  }
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-5 py-8 md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="dev-mono text-xs uppercase tracking-[.25em] text-cyan-600">
                Knowledge hub
              </p>
              <h1 className="mt-2 text-3xl font-bold">Resources</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Keep snippets, notes, and references close to your build.
              </p>
            </div>
            <button
              onClick={() => setShow(true)}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-700"
            >
              <Plus size={16} /> New resource
            </button>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {stats.map(({ label, value, Icon }) => (
              <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-slate-400"><span className="text-xs font-semibold uppercase tracking-wider">{label}</span><Icon size={17} /></div>
                <p className="mt-2 text-2xl font-bold">{String(value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resources..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pl-10 pr-4 outline-none focus:border-cyan-500"
            />
            </div>
            <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {types.map((type) => <button key={type} onClick={() => setTypeFilter(type)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${typeFilter === type ? 'bg-slate-950 text-white dark:bg-cyan-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{type === 'ALL' ? 'All types' : type}</button>)}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white dark:bg-slate-900 p-12 text-center">
              <BookOpen className="mx-auto text-cyan-500" />
              <h2 className="mt-3 font-semibold">No resources yet</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Save your first snippet, note, or reference.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((i) => (
                <article
                  key={i.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-900/5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2 dev-mono text-[10px] uppercase text-cyan-600">
                      {typeIcon(i.type)}
                      {i.type}
                    </span>
                    <button
                      onClick={() => remove(i.id)}
                      aria-label={`Delete ${i.title}`}
                      className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h2 className="mt-4 font-semibold">{i.title}</h2>
                  <div className="prose prose-sm mt-3 max-w-none dark:prose-invert">
                    {renderMarkdown(i.content)}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {(i.tags ?? []).map((t) => (
                      <span
                        key={t}
                        className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
          {show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
              <form
                onSubmit={create}
                className="flex max-h-[90vh] w-full max-w-6xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between"><div><p className="dev-mono text-xs uppercase tracking-widest text-cyan-600">Knowledge hub</p><h2 className="mt-1 text-xl font-bold">New resource</h2></div><button type="button" aria-label="Close dialog" onClick={() => setShow(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button></div>
                <input
                  required
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
                />
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option>NOTE</option>
                  <option>SNIPPET</option>
                  <option>DOCUMENTATION</option>
                  <option>REFERENCE</option>
                </select>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-semibold">Document</label>
                      <span className="text-xs text-slate-400">Markdown enabled</span>
                    </div>
                    <textarea
                      required
                      rows={20}
                      placeholder="Start writing... Try /h1, /quote, /todo, or /code"
                      value={form.content}
                      onChange={(e) => insertSlashCommand(e.currentTarget)}
                      className="min-h-[520px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-6 font-sans text-base leading-8 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-semibold">Preview</label>
                      <span className="text-xs text-slate-400">Live preview</span>
                    </div>
                    <div className="min-h-[520px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-950">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {renderMarkdown(form.content)}
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  placeholder="Tags, comma separated"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShow(false)}
                    className="rounded-xl px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                    Save resource
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
