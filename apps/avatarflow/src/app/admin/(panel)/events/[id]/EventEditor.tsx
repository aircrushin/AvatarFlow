'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EventFull, EventStatus, EventTheme } from '@/lib/types';
import {
  ColorField,
  PhonePreview,
  StatusPicker,
  StylePicker,
  Switch,
  type StyleOption,
} from '@/components/admin/EventFormParts';
import { IconSparkle } from '@/components/admin/icons';

type SaveState = 'clean' | 'dirty' | 'saving' | 'error';

export function EventEditor({ event, styles }: { event: EventFull; styles: StyleOption[] }) {
  const router = useRouter();
  const initial = useMemo(
    () => ({
      form: {
        name: event.name,
        subtitle: event.subtitle,
        description: event.description,
        status: event.status,
        generationLimit: event.generationLimit ?? 0,
      },
      theme: event.theme,
      selected: [...event.styles].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.styleName),
    }),
    [event],
  );

  const [form, setForm] = useState(initial.form);
  const [theme, setTheme] = useState<EventTheme>(initial.theme);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<{ primaryColor: string; secondaryColor: string } | null>(null);

  const dirty = JSON.stringify({ form, theme, selected }) !== baseline;
  const state: SaveState = saving ? 'saving' : error ? 'error' : dirty ? 'dirty' : 'clean';

  const save = useCallback(async () => {
    if (selected.length === 0) {
      setError('请至少选择一个头像风格');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const existing = new Map(event.styles.map((s) => [s.styleName, s.styleOptions]));
      // Logo is owned by the assets tab; sending a stale value would clobber a fresh upload.
      const { logoUrl: _logoUrl, ...themePatch } = theme;
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          generationLimit: form.generationLimit > 0 ? form.generationLimit : null,
          theme: themePatch,
          styles: selected.map((name, i) => ({ styleName: name, styleOptions: existing.get(name) ?? {}, sortOrder: i })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '保存失败');
      setBaseline(JSON.stringify({ form, theme, selected }));
      setSavedAt(new Date());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [event.id, event.styles, form, theme, selected, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !saving) void save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [dirty, saving, save]);

  const reset = () => {
    const snap = JSON.parse(baseline) as typeof initial;
    setForm(snap.form);
    setTheme(snap.theme);
    setSelected(snap.selected);
    setError('');
  };

  const setThemeField = <K extends keyof EventTheme>(key: K, value: EventTheme[K]) => {
    setError('');
    setTheme((prev) => ({ ...prev, [key]: value }));
  };
  const setFormField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const extractColors = async () => {
    setExtracting(true);
    setError('');
    setExtracted(null);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/extract-colors`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '提取失败');
      setTheme((prev) => ({ ...prev, primaryColor: data.primaryColor, secondaryColor: data.secondaryColor }));
      setExtracted({ primaryColor: data.primaryColor, secondaryColor: data.secondaryColor });
    } catch (err) {
      setError(err instanceof Error ? err.message : '提取失败');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="adm-split">
      <div>
        <section className="adm-card adm-section">
          <div className="adm-card-head">
            <div>
              <h2 className="adm-card-title">基础信息</h2>
              <p className="adm-card-desc">展示在活动首页的标题与说明</p>
            </div>
          </div>
          <div className="adm-card-body adm-form-grid">
            <div className="adm-field">
              <label htmlFor="ev-name">活动名称</label>
              <input id="ev-name" value={form.name} maxLength={120} onChange={(e) => setFormField('name', e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="ev-sub">副标题</label>
              <input id="ev-sub" value={form.subtitle} maxLength={200} placeholder="一句话说明活动亮点" onChange={(e) => setFormField('subtitle', e.target.value)} />
            </div>
            <div className="adm-field">
              <div className="adm-label-row">
                <label htmlFor="ev-desc">活动说明</label>
                <span className="adm-hint">留空时使用「用户端短文案」</span>
              </div>
              <textarea id="ev-desc" value={form.description} onChange={(e) => setFormField('description', e.target.value)} />
            </div>
            <div className="adm-field">
              <span className="adm-label">活动状态</span>
              <StatusPicker value={form.status} options={['draft', 'active', 'paused', 'expired']} onChange={(v: EventStatus) => setFormField('status', v)} />
            </div>
            <div className="adm-field" style={{ maxWidth: 280 }}>
              <label htmlFor="ev-limit">生成次数上限</label>
              <input id="ev-limit" type="number" min={0} value={form.generationLimit} onChange={(e) => setFormField('generationLimit', Math.max(0, Number(e.target.value) || 0))} />
              <span className="adm-hint">填 0 表示不限制</span>
            </div>
          </div>
        </section>

        <section className="adm-card adm-section">
          <div className="adm-card-head">
            <div>
              <h2 className="adm-card-title">头像风格</h2>
              <p className="adm-card-desc">点选的顺序即用户端展示顺序，仅包含已审核的 CC0 商用风格</p>
            </div>
            <span className="adm-mono adm-faint">{selected.length} / {styles.length}</span>
          </div>
          <div className="adm-card-body">
            <StylePicker styles={styles} selected={selected} onChange={(v) => { setError(''); setSelected(v); }} />
          </div>
        </section>

        <section className="adm-card adm-section">
          <div className="adm-card-head">
            <div>
              <h2 className="adm-card-title">品牌主题</h2>
              <p className="adm-card-desc">配色会同时作用于活动页面与生成的头像</p>
            </div>
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => void extractColors()} disabled={extracting || !theme.logoUrl} title={theme.logoUrl ? undefined : '请先在「素材与二维码」中上传 Logo'}>
              <IconSparkle />
              {extracting ? '提取中…' : '从 Logo 提取配色'}
            </button>
          </div>
          <div className="adm-card-body adm-form-grid">
            <div className="adm-form-row">
              <ColorField label="主色" value={theme.primaryColor} onChange={(v) => setThemeField('primaryColor', v)} />
              <ColorField label="辅助色" value={theme.secondaryColor} onChange={(v) => setThemeField('secondaryColor', v)} />
              <ColorField label="页面背景" value={theme.backgroundColor} onChange={(v) => setThemeField('backgroundColor', v)} />
              <ColorField label="头像底色" value={theme.avatarBackground} onChange={(v) => setThemeField('avatarBackground', v)} />
            </div>
            {extracted && (
              <p className="adm-hint" style={{ margin: '-4px 0 0' }}>
                已填入主色 {extracted.primaryColor} 与辅助色 {extracted.secondaryColor}，确认后保存即可生效。
              </p>
            )}

            <div className="adm-toggle-row">
              <div>
                <div className="adm-label">品牌边框</div>
                <div className="adm-hint">在头像四周叠加一圈品牌色描边</div>
              </div>
              <Switch label="品牌边框" checked={theme.borderEnabled} onChange={(v) => setThemeField('borderEnabled', v)} />
            </div>
            {theme.borderEnabled && (
              <div className="adm-form-row">
                <ColorField label="边框颜色" value={theme.borderColor} onChange={(v) => setThemeField('borderColor', v)} />
                <div className="adm-field">
                  <div className="adm-label-row">
                    <label htmlFor="ev-bw">边框粗细</label>
                    <span className="adm-mono adm-faint">{theme.borderWidth}px</span>
                  </div>
                  <input id="ev-bw" type="range" min={0} max={40} value={theme.borderWidth} onChange={(e) => setThemeField('borderWidth', Number(e.target.value))} style={{ height: 38, padding: 0, border: 0, boxShadow: 'none', accentColor: '#14161a' }} />
                </div>
              </div>
            )}

            <div className="adm-toggle-row">
              <div>
                <div className="adm-label">底部贴纸</div>
                <div className="adm-hint">在头像底部显示一条主色文字横幅</div>
              </div>
              <Switch label="底部贴纸" checked={theme.stickerEnabled} onChange={(v) => setThemeField('stickerEnabled', v)} />
            </div>
            {theme.stickerEnabled && (
              <div className="adm-field">
                <div className="adm-label-row">
                  <label htmlFor="ev-sticker">贴纸文字</label>
                  <span className="adm-mono adm-faint">{theme.stickerText.length}/40</span>
                </div>
                <input id="ev-sticker" value={theme.stickerText} maxLength={40} placeholder="例如：2026 品牌日 · 我在现场" onChange={(e) => setThemeField('stickerText', e.target.value)} />
              </div>
            )}

            <div className="adm-field">
              <label htmlFor="ev-ins">用户端短文案</label>
              <textarea id="ev-ins" value={theme.instructions} maxLength={1000} onChange={(e) => setThemeField('instructions', e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="ev-contact">联系方式</label>
              <input id="ev-contact" value={theme.contact} maxLength={500} placeholder="展示在活动页底部，可选" onChange={(e) => setThemeField('contact', e.target.value)} />
            </div>
          </div>
        </section>

        <div className="adm-savebar" data-state={state === 'saving' ? 'dirty' : state} role="status">
          <div className="adm-savebar-status">
            <i />
            {state === 'clean' && (savedAt ? `已保存 · ${savedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '所有更改已保存')}
            {state === 'dirty' && '有未保存的更改'}
            {state === 'saving' && '正在保存…'}
            {state === 'error' && error}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {dirty && (
              <button type="button" className="adm-btn adm-btn-sm" style={{ background: 'transparent', borderColor: '#3a3d43', color: '#c4c8bf' }} onClick={reset} disabled={saving}>
                撤销
              </button>
            )}
            <button type="button" className="adm-btn adm-btn-lime adm-btn-sm" onClick={save} disabled={!dirty || saving} title="Ctrl / ⌘ + S">
              {saving ? '保存中…' : '保存更改'}
            </button>
          </div>
        </div>
      </div>

      <aside className="adm-sticky">
        <PhonePreview name={form.name} subtitle={form.subtitle} description={form.description} theme={theme} styleName={selected[0]} />
      </aside>
    </div>
  );
}
