"use client";
import React from "react";

type Stat = { label: string; value: number | string; color?: string };

export default function AdminHeader({
  title,
  subtitle,
  stats = [],
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  stats?: Stat[];
  children?: React.ReactNode; // filters / controls row
  actions?: React.ReactNode; // right aligned actions (e.g., refresh)
}) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(25,118,210,1) 0%, rgba(13,71,161,1) 100%)',
      borderRadius: 20,
      boxShadow: '0 12px 40px rgba(0,0,0,0.20)',
      border: '1px solid rgba(255,255,255,0.12)',
      padding: '48px 32px',
      marginBottom: 24,
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.10) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      <h1 style={{ color: '#ffffff', fontWeight: 800, fontSize: 40, marginBottom: 8, textShadow: '0 2px 14px rgba(0,0,0,0.25)', letterSpacing: '-0.4px', position: 'relative', zIndex: 1 }}>{title}</h1>
      {subtitle && (
        <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: 16, marginBottom: 18, fontWeight: 500, position: 'relative', zIndex: 1 }}>{subtitle}</p>
      )}

      {stats.length > 0 && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16, position: 'relative', zIndex: 1 }}>
          {stats.map((s, idx) => (
            <div key={idx} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', color: '#fff', display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, opacity: 0.9 }}>{s.label}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: s.color || '#ffffff' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {(children || actions) && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {children}
          {actions}
        </div>
      )}
    </div>
  );
}


