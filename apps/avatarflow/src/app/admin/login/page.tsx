'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <main style={{ minHeight: '100vh', background: 'var(--paper)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: 32 }}>
        <p className="eyebrow">AvatarFlow</p>
        <h1 style={{ fontSize: 24, letterSpacing: '-0.02em', margin: '12px 0 28px' }}>管理员登录</h1>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="pw">管理密码</label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="error-msg" style={{ marginTop: 12 }}>{error}</p>}
          <button className="btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: 20 }}>
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
      </div>
    </main>
  );
}
