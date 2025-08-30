'use client';

export default function BikeLoader({ size = 96, label }: { size?: number; label?: string }) {
  const roadHeight = Math.max(10, Math.round(size * 0.18));
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size, overflow: 'visible' }}>
        <div className="bike-loader" style={{ width: size, height: size }}>
          <img src="/bike_load.svg" alt="Loading" style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
        <div
          className="road"
          style={{
            position: 'absolute',
            left: '50%',
            top: Math.round(size - roadHeight * 1.22),
            transform: 'translateX(-50%)',
            width: Math.round(size * 1.8),
            height: roadHeight,
            borderRadius: 999,
            background: '#1f2937',
            overflow: 'hidden',
            boxShadow: 'inset 0 -2px 0 rgba(255,255,255,0.08), inset 0 2px 0 rgba(0,0,0,0.25), 0 6px 10px rgba(0,0,0,0.15)',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        >
          <div
            className="road-stripes"
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: '200%',
              height: Math.max(2, Math.round(size * 0.04)),
              transform: 'translateY(-50%)',
              background: 'repeating-linear-gradient(90deg, transparent 0 28px, rgba(255,255,255,0.9) 28px 46px, transparent 46px 80px)',
              opacity: 0.95
            }}
          />
        </div>
      </div>
      {label ? <div style={{ fontWeight: 800, color: '#1976d2', marginTop: -4 }}>{label}</div> : null}
      <style>{`
        @keyframes ride {
          0% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
          100% { transform: translateX(-6px); }
        }
        @keyframes bob {
          0% { transform: translateY(0) rotate(-0.3deg); }
          50% { transform: translateY(-0.5px) rotate(0.3deg); }
          100% { transform: translateY(0) rotate(-0.3deg); }
        }
        @keyframes move-road {
          0% { background-position-x: 0; }
          100% { background-position-x: -80px; }
        }
        .bike-loader { animation: ride 1.3s ease-in-out infinite, bob 0.9s ease-in-out infinite; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.18)); transform-origin: 50% 85%; position: relative; z-index: 1; }
        .road-stripes { animation: move-road 0.7s linear infinite; }
      `}</style>
    </div>
  );
}


