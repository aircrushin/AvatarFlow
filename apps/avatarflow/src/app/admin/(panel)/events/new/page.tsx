'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_THEME, type EventTheme } from '@/lib/types';

interface StyleMeta {
  name: string;
  label: string;
  license: string;
  author: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const [styles, setStyles] = useState<StyleMeta[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    slug: '',
    name: '',
    subtitle: '',
    description: '',
    status: 'draft',
  });
  const [theme, setTheme] = useState<EventTheme>(DEFAULT_THEME);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/public/styles')
      .then((r) => r.json())
      .then((d) => {
        setStyles(d.styles);
        setSelected(d.styles.slice(0, 3).map((s: StyleMeta) => s.name));
      })
      .catch(() => setError('无法加载风格列表'));
  }, []);

  const toggleStyle = (name: string) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));

  const setThemeField = <K extends keyof EventTheme>(key: K, value: EventTheme[K]) =>
    setTheme((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          theme,
          styles: selected.map((name, i) => ({ styleName: name, styleOptions: {}, sortOrder: i })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '创建失败');
      router.push(`/admin/events/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ maxWidth: 760 }}>
      <p className="eyebrow">New event</p>
      <h1 style={{ fontSize: 28, letterSpacing: '-0.025em', margin: '10px 0 32px' }}>新建活动</h1>

      <form onSubmit={submit}>
        <section className="card" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, marginBottom: 20 }}>基础信息</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="field">
              <label>活动名称</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：2026 春季品牌日" />
            </div>
            <div className="field">
              <label>访问路径（slug）</label>
              <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="spring-brand-2026" />
              <span className="faint" style={{ fontSize: 12 }}>访问链接：/e/{form.slug || 'your-slug'}</span>
            </div>
            <div className="field">
              <label>副标题</label>
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div className="field">
              <label>活动说明</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="field">
              <label>状态</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">草稿</option>
                <option value="active">进行中</option>
                <option value="paused">暂停</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, marginBottom: 20 }}>品牌主题</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <ColorField label="主色" value={theme.primaryColor} onChange={(v) => setThemeField('primaryColor', v)} />
            <ColorField label="辅助色" value={theme.secondaryColor} onChange={(v) => setThemeField('secondaryColor', v)} />
            <ColorField label="背景色" value={theme.backgroundColor} onChange={(v) => setThemeField('backgroundColor', v)} />
            <ColorField label="头像背景" value={theme.avatarBackground} onChange={(v) => setThemeField('avatarBackground', v)} />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>活动说明（用户端短文案）</label>
            <textarea value={theme.instructions} onChange={(e) => setThemeField('instructions', e.target.value)} />
          </div>
        </section>

        <section className="card" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>头像风格</h2>
          <p className="faint" style={{ fontSize: 12, marginBottom: 18 }}>仅可选择已审核的 CC0 商用风格。</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {styles.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => toggleStyle(s.name)}
                className="btn btn-ghost"
                style={{
                  minHeight: 34, fontSize: 12, padding: '0 12px',
                  borderColor: selected.includes(s.name) ? 'var(--ink)' : 'var(--line)',
                  background: selected.includes(s.name) ? 'var(--ink)' : 'transparent',
                  color: selected.includes(s.name) ? '#fff' : 'var(--ink)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          {selected.length === 0 && <p className="error-msg" style={{ marginTop: 12 }}>请至少选择一个风格</p>}
        </section>

        {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
        <button className="btn btn-accent" type="submit" disabled={saving || selected.length === 0}>
          {saving ? '创建中…' : '创建活动'}
        </button>
      </form>
    </main>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 44, minHeight: 40, padding: 2, cursor: 'pointer' }} />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="mono" style={{ flex: 1 }} />
      </div>
    </div>
  );
}
