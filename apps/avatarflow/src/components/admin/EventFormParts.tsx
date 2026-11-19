'use client';

import type { EventStatus, EventTheme } from '@/lib/types';
import { STATUS_LABEL } from './StatusBadge';

export interface StyleOption {
  name: string;
  label: string;
}

export const stylePreviewSrc = (name: string) => `/api/public/styles/${encodeURIComponent(name)}/preview`;

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="adm-field">
      <label>{label}</label>
      <div className="adm-color">
        <span className="adm-color-swatch" style={{ background: valid ? value : '#fff' }}>
          <input type="color" aria-label={`${label}取色器`} value={valid ? value : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        </span>
        <input
          className="adm-color-hex"
          value={value}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.trim();
            onChange(v.startsWith('#') ? v : `#${v}`);
          }}
          aria-invalid={!valid}
        />
      </div>
    </div>
  );
}

const STATUS_HINT: Record<EventStatus, string> = {
  draft: '仅后台可见',
  active: '对外开放生成',
  paused: '暂停新的生成',
  expired: '仅可浏览',
};

export function StatusPicker({
  value,
  options,
  onChange,
}: {
  value: EventStatus;
  options: EventStatus[];
  onChange: (v: EventStatus) => void;
}) {
  return (
    <div className={`adm-status-pick${options.length === 3 ? ' three' : ''}`} role="group" aria-label="活动状态">
      {options.map((s) => (
        <button key={s} type="button" className="adm-status-opt" data-status={s} aria-pressed={value === s} onClick={() => onChange(s)}>
          <strong><i />{STATUS_LABEL[s]}</strong>
          <span>{STATUS_HINT[s]}</span>
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="adm-switch" onClick={() => onChange(!checked)} />
  );
}

export function StylePicker({
  styles,
  selected,
  onChange,
}: {
  styles: StyleOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (styles.length === 0) {
    return (
      <div className="adm-styles" aria-busy>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="adm-style" style={{ cursor: 'default' }}>
            <div className="adm-style-img" />
            <div className="adm-style-name">&nbsp;</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="adm-styles">
      {styles.map((s) => {
        const index = selected.indexOf(s.name);
        const on = index !== -1;
        return (
          <button
            key={s.name}
            type="button"
            className="adm-style"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((n) => n !== s.name) : [...selected, s.name])}
          >
            <span className="adm-style-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stylePreviewSrc(s.name)} alt="" loading="lazy" />
            </span>
            <span className="adm-style-name">{s.label}</span>
            <span className="adm-style-order" aria-hidden>{on ? index + 1 : ''}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Approximates the participant-facing intro page so organizers see brand changes live. */
export function PhonePreview({
  name,
  subtitle,
  description,
  theme,
  styleName,
}: {
  name: string;
  subtitle: string;
  description: string;
  theme: EventTheme;
  styleName: string | undefined;
}) {
  const body = description || theme.instructions;
  return (
    <div>
      <div className="adm-preview-label">
        <span>用户端实时预览</span>
        <span className="adm-mono">390 × 844</span>
      </div>
      <div className="adm-phone">
        <div className="adm-phone-notch" />
        <div className="adm-phone-screen" style={{ background: theme.backgroundColor, color: '#16181d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 18 }}>
            {theme.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={theme.logoUrl} alt="" style={{ height: 18, maxWidth: 80, objectFit: 'contain' }} />
            ) : (
              <span style={{ fontWeight: 600, fontSize: 11, letterSpacing: '-0.02em' }}>AvatarFlow</span>
            )}
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: theme.secondaryColor }} />
          </div>

          <div
            style={{
              position: 'relative',
              alignSelf: 'center',
              width: '62%',
              aspectRatio: '1',
              borderRadius: 10,
              background: theme.avatarBackground,
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
              boxShadow: theme.borderEnabled ? `inset 0 0 0 ${Math.max(1, theme.borderWidth / 3)}px ${theme.borderColor}` : '0 0 0 1px rgba(0,0,0,0.06)',
              marginBottom: 16,
            }}
          >
            {styleName ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stylePreviewSrc(styleName)} alt="" style={{ width: '78%', height: '78%' }} />
            ) : (
              <span style={{ fontSize: 10, color: '#8b9099' }}>未选择风格</span>
            )}
            {theme.stickerEnabled && theme.stickerText.trim() && (
              <span style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: '3px 4px', background: theme.primaryColor, color: '#fff', fontSize: 8, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {theme.stickerText}
              </span>
            )}
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.14em', color: theme.primaryColor }}>品牌头像互动</div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.25, margin: '6px 0 4px', wordBreak: 'break-word' }}>
              {name || '活动名称'}
            </div>
            {subtitle && <div style={{ fontSize: 10.5, color: theme.primaryColor, opacity: 0.8, marginBottom: 6 }}>{subtitle}</div>}
            <div style={{ fontSize: 9.5, lineHeight: 1.7, color: '#4b5058', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {body}
            </div>
          </div>

          <div style={{ marginTop: 12, height: 34, borderRadius: 8, background: theme.primaryColor, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 500 }}>
            开始生成头像
          </div>
          {theme.contact && (
            <div style={{ marginTop: 8, fontSize: 8.5, color: '#8b9099', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{theme.contact}</div>
          )}
        </div>
      </div>
    </div>
  );
}
