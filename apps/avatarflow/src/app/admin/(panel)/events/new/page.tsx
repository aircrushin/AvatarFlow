'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { slugFromName } from '@/lib/slug';
import { DEFAULT_THEME, type EventStatus, type EventTheme } from '@/lib/types';
import {
  ColorField,
  PhonePreview,
  StatusPicker,
  StylePicker,
  type StyleOption,
} from '@/components/admin/EventFormParts';
import { STATUS_LABEL } from '@/components/admin/StatusBadge';

export default function NewEventPage() {
  const router = useRouter();
  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    slug: '',
    name: '',
    subtitle: '',
    description: '',
    status: 'draft' as EventStatus,
  });
  const [theme, setTheme] = useState<EventTheme>(DEFAULT_THEME);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Once the organizer edits the slug by hand, stop overwriting it from the name.
  const slugLocked = useRef(false);

  useEffect(() => {
    fetch('/api/public/styles')
      .then((r) => r.json())
      .then((d) => {
        setStyles(d.styles);
        setSelected(d.styles.slice(0, 3).map((s: StyleOption) => s.name));
      })
      .catch(() => setError('无法加载风格列表'));
  }, []);

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
    <main className="adm-page">
      <div className="adm-crumbs">
        <Link href="/admin/events">活动管理</Link>
        <span aria-hidden>/</span>
        <span style={{ color: 'var(--a-ink-2)' }}>新建</span>
      </div>
      <header className="adm-head adm-rise">
        <div>
          <h1 className="adm-title">新建活动</h1>
          <p className="adm-sub">填写基础信息、挑选头像风格并设定品牌配色。Logo 与二维码可在创建后配置。</p>
        </div>
      </header>

      <form onSubmit={submit} className="adm-split adm-rise adm-rise-1">
        <div>
          <section className="adm-card adm-section">
            <div className="adm-card-head">
              <div>
                <h2 className="adm-card-title"><StepNo n={1} />基础信息</h2>
              </div>
            </div>
            <div className="adm-card-body adm-form-grid">
              <div className="adm-field">
                <label htmlFor="new-name">活动名称</label>
                <input
                  id="new-name"
                  required
                  autoFocus
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name,
                      slug: slugLocked.current ? prev.slug : slugFromName(name),
                    }));
                  }}
                  placeholder="例如：2026 春季品牌日"
                />
              </div>
              <div className="adm-field">
                <div className="adm-label-row">
                  <label htmlFor="new-slug">访问路径</label>
                  <span className="adm-hint">根据名称自动生成，可手动修改</span>
                </div>
                <div className="adm-prefix">
                  <span>/e/</span>
                  <input
                    id="new-slug"
                    required
                    className="adm-mono"
                    value={form.slug}
                    onChange={(e) => {
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                      slugLocked.current = slug.length > 0;
                      setForm((prev) => ({ ...prev, slug }));
                    }}
                    placeholder="spring-brand-2026"
                  />
                </div>
              </div>
              <div className="adm-field">
                <label htmlFor="new-sub">副标题</label>
                <input id="new-sub" maxLength={200} value={form.subtitle} placeholder="一句话说明活动亮点" onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
              </div>
              <div className="adm-field">
                <div className="adm-label-row">
                  <label htmlFor="new-desc">活动说明</label>
                  <span className="adm-hint">留空时使用「用户端短文案」</span>
                </div>
                <textarea id="new-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="adm-field">
                <span className="adm-label">初始状态</span>
                <StatusPicker value={form.status} options={['draft', 'active', 'paused']} onChange={(status) => setForm({ ...form, status })} />
              </div>
            </div>
          </section>

          <section className="adm-card adm-section">
            <div className="adm-card-head">
              <div>
                <h2 className="adm-card-title"><StepNo n={2} />头像风格</h2>
                <p className="adm-card-desc">点选的顺序即用户端展示顺序，仅包含已审核的 CC0 商用风格</p>
              </div>
              <span className="adm-mono adm-faint">{selected.length} / {styles.length || '—'}</span>
            </div>
            <div className="adm-card-body">
              <StylePicker styles={styles} selected={selected} onChange={setSelected} />
            </div>
          </section>

          <section className="adm-card adm-section">
            <div className="adm-card-head">
              <div>
                <h2 className="adm-card-title"><StepNo n={3} />品牌主题</h2>
                <p className="adm-card-desc">边框、贴纸等更多选项可在创建后调整</p>
              </div>
            </div>
            <div className="adm-card-body adm-form-grid">
              <div className="adm-form-row">
                <ColorField label="主色" value={theme.primaryColor} onChange={(v) => setThemeField('primaryColor', v)} />
                <ColorField label="辅助色" value={theme.secondaryColor} onChange={(v) => setThemeField('secondaryColor', v)} />
                <ColorField label="页面背景" value={theme.backgroundColor} onChange={(v) => setThemeField('backgroundColor', v)} />
                <ColorField label="头像底色" value={theme.avatarBackground} onChange={(v) => setThemeField('avatarBackground', v)} />
              </div>
              <div className="adm-field">
                <label htmlFor="new-ins">用户端短文案</label>
                <textarea id="new-ins" maxLength={1000} value={theme.instructions} onChange={(e) => setThemeField('instructions', e.target.value)} />
              </div>
            </div>
          </section>

          <div className="adm-savebar" data-state={error ? 'error' : 'dirty'}>
            <div className="adm-savebar-status">
              <i />
              {error || (selected.length === 0 ? '请至少选择一个头像风格' : `将以「${STATUS_LABEL[form.status]}」状态创建`)}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Link href="/admin/events" className="adm-btn adm-btn-sm" style={{ background: 'transparent', borderColor: '#3a3d43', color: '#c4c8bf' }}>取消</Link>
              <button className="adm-btn adm-btn-lime adm-btn-sm" type="submit" disabled={saving || selected.length === 0 || !form.name || !form.slug}>
                {saving ? '创建中…' : '创建活动'}
              </button>
            </div>
          </div>
        </div>

        <aside className="adm-sticky">
          <PhonePreview name={form.name} subtitle={form.subtitle} description={form.description} theme={theme} styleName={selected[0]} />
        </aside>
      </form>
    </main>
  );
}

function StepNo({ n }: { n: number }) {
  return (
    <span
      className="adm-mono"
      style={{ display: 'inline-grid', placeItems: 'center', width: 20, height: 20, marginRight: 10, borderRadius: 6, background: 'var(--a-ink)', color: 'var(--a-lime)', fontSize: 11, verticalAlign: '1px' }}
    >
      {n}
    </span>
  );
}
