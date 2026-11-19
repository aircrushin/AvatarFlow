'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const SHOWCASE = ['notionists', 'lorelei', 'open-peeps', 'thumbs', 'pixel-art', 'dogs'];

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '登录失败');
      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="adm-login">
      <section className="adm-login-art">
        <Link href="/" className="adm-brand" style={{ padding: 0, height: 'auto', border: 0 }}>
          <span className="adm-brand-mark">A</span>
          AvatarFlow
        </Link>

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 88px)', gap: 12, marginBottom: 40 }}>
            {SHOWCASE.map((name, i) => (
              <div
                key={name}
                className="adm-rise"
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 18,
                  display: 'grid',
                  placeItems: 'center',
                  background: i === 1 ? 'var(--a-lime)' : i === 3 ? '#f2f3ee' : '#1c1f24',
                  border: '1px solid #2a2d33',
                  animationDelay: `${i * 60}ms`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/public/styles/${name}/preview`} alt="" width={64} height={64} />
              </div>
            ))}
          </div>
          <h2 style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.25, maxWidth: 420 }}>
            让每一次扫码，<br />都成为一次品牌曝光。
          </h2>
          <p style={{ margin: '14px 0 0', fontSize: 14, color: '#8a8f97', maxWidth: 400, lineHeight: 1.7 }}>
            配置品牌元素、发布活动、追踪参与数据，都在这里完成。
          </p>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: '#5d6168' }}>基于 DiceBear CC0 开源风格构建</p>
      </section>

      <section className="adm-login-form">
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h1 className="adm-title" style={{ fontSize: 24 }}>登录管理后台</h1>
          <p className="adm-sub" style={{ marginBottom: 28 }}>请输入管理员密码以继续。</p>
          <form onSubmit={submit} className="adm-form-grid">
            <div className="adm-field">
              <label htmlFor="pw">管理密码</label>
              <input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoFocus
                autoComplete="current-password"
                aria-invalid={!!error}
                style={error ? { borderColor: 'var(--a-red)' } : undefined}
                required
              />
              {error && <span style={{ fontSize: 12.5, color: 'var(--a-red)' }}>{error}</span>}
            </div>
            <button className="adm-btn adm-btn-lg adm-btn-block" type="submit" disabled={loading || !password}>
              {loading ? '登录中…' : '登录'}
            </button>
          </form>
          <Link href="/" className="adm-faint" style={{ display: 'inline-block', marginTop: 24, fontSize: 12.5 }}>← 返回官网</Link>
        </div>
      </section>
    </main>
  );
}
