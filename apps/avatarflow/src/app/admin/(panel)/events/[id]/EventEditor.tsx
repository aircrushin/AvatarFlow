'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EventFull, EventStatus, EventTheme } from '@/lib/types';

export function EventEditor({ event }: { event: EventFull }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: event.name,
    subtitle: event.subtitle,
    description: event.description,
    status: event.status,
    generationLimit: event.generationLimit ?? 0,
  });
  const [theme, setTheme] = useState<EventTheme>(event.theme);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          generationLimit: form.generationLimit > 0 ? form.generationLimit : null,
          theme,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '保存失败');
      setMessage('已保存');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const setThemeField = <K extends keyof EventTheme>(key: K, value: EventTheme[K]) =>
    setTheme((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <section className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 20 }}>基础信息</h2>
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="field"><label>活动名称</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>副标题</label><input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
          <div className="field"><label>活动说明</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field">
              <label>状态</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}>
                <option value="draft">草稿</option>
                <option value="active">进行中</option>
                <option value="paused">暂停</option>
                <option value="expired">已结束</option>
              </select>
            </div>
            <div className="field">
              <label>生成次数上限（0 为不限）</label>
              <input type="number" min={0} value={form.generationLimit} onChange={(e) => setForm({ ...form, generationLimit: Number(e.target.value) })} />
            </div>
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
          <label>用户端短文案</label>
          <textarea value={theme.instructions} onChange={(e) => setThemeField('instructions', e.target.value)} />
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>联系方式</label>
          <input value={theme.contact} onChange={(e) => setThemeField('contact', e.target.value)} />
        </div>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn btn-accent" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存更改'}</button>
        {message && <span style={{ fontSize: 13, color: '#3b6d11' }}>{message}</span>}
        {error && <span className="error-msg">{error}</span>}
      </div>
    </div>
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
