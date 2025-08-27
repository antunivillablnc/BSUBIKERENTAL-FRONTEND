"use client";
import { useRef, useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import { EffectCoverflow, Autoplay, Keyboard } from 'swiper/modules';
import { useRouter } from 'next/navigation';

export default function BikeRentalPage() {
  const swiperRef = useRef<any>(null);
  const router = useRouter();
  // Default to desktop values for SSR
  const [slidesPerView, setSlidesPerView] = useState(3);
  const [swiperWidth, setSwiperWidth] = useState<number | string>(900);
  const [bikes, setBikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 600) {
        setSlidesPerView(1);
        setSwiperWidth('100vw');
      } else if (window.innerWidth < 900) {
        setSlidesPerView(2);
        setSwiperWidth(360);
      } else {
        setSlidesPerView(3);
        setSwiperWidth(900);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function fetchBikes() {
      setLoading(true);
      try {
        const res = await fetch('/api/bikes');
        const data = await res.json();
        if (data.success) {
          setBikes(data.bikes);
        } else {
          setBikes([]);
        }
      } catch {
        setBikes([]);
      }
      setLoading(false);
    }
    fetchBikes();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: `url('/car-rental-app.jpg') center center / cover no-repeat fixed` }}>
      {/* Overlay for darkening the background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(80,80,80,0.7)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />
      {/* Hero Section */}
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '0 8px', position: 'relative', zIndex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
            <div className="flash-spinner" />
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: 18, letterSpacing: 1, textShadow: '0 2px 8px rgba(0,0,0,0.45)' }}>Loading bikes...</div>
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
              .flash-spinner {
                width: 74px; height: 74px; border-radius: 50%;
                background: conic-gradient(#00e5ff, #00ff95, #ffd54f, #ff4081, #00e5ff);
                -webkit-mask: radial-gradient(farthest-side,#0000 calc(100% - 10px),#000 0);
                        mask: radial-gradient(farthest-side,#0000 calc(100% - 10px),#000 0);
                animation: spin 1s linear infinite;
                box-shadow: 0 0 22px rgba(255,255,255,0.75), 0 0 44px rgba(0,229,255,0.45);
              }
            `}</style>
          </div>
        ) : bikes.length === 0 ? (
          <div style={{ color: '#b22222', fontWeight: 700, fontSize: 22, marginTop: 40 }}>No bikes available at the moment.</div>
        ) : (
          <>
            {/* Move the Rent a bike button above the Swiper carousel */}
            <button
              style={{
                background: 'linear-gradient(90deg, #2196f3 0%, #64b5f6 100%)',
                color: '#fff',
                fontWeight: 800,
                padding: '18px 0',
                borderRadius: 12,
                fontSize: 22,
                border: '2px solid #1e88e5',
                cursor: 'pointer',
                width: 320,
                maxWidth: '90vw',
                boxShadow: '0 8px 32px rgba(33, 150, 243, 0.20), 0 2px 8px rgba(0,0,0,0.08)',
                outline: 'none',
                transition: 'background 0.2s, box-shadow 0.2s, transform 0.15s',
                letterSpacing: 1,
                margin: '0 auto 32px',
                display: 'block',
                opacity: 1,
                textShadow: '0 2px 8px rgba(0,0,0,0.10)',
                userSelect: 'none',
              }}
              onClick={() => router.push('/reserve/apply')}
              onMouseOver={e => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #64b5f6 0%, #90caf9 100%)';
                e.currentTarget.style.boxShadow = '0 14px 40px rgba(33,150,243,0.35), 0 6px 14px rgba(0,0,0,0.12)';
                e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #2196f3 0%, #64b5f6 100%)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(33,150,243,0.20), 0 2px 8px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
              }}
              tabIndex={0}
              aria-label="Rent a bike"
            >
              Rent a bike
            </button>
            <div style={{
              textAlign: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 18,
              marginTop: 8,
              marginBottom: 10,
              letterSpacing: 0.1,
              textShadow: '0 2px 6px rgba(0,0,0,0.6)',
              background: 'transparent',
              padding: 0,
              borderRadius: 0,
              display: 'inline-block',
              position: 'relative',
              zIndex: 1,
            }}>
              Swipe or scroll the bikes left and right
            </div>
            <Swiper
              effect="coverflow"
              grabCursor={true}
              centeredSlides={true}
              slidesPerView={slidesPerView}
              loop={true}
              coverflowEffect={{
                rotate: 30,
                stretch: 0,
                depth: 150,
                modifier: 1,
                slideShadows: true,
              }}
              modules={[EffectCoverflow, Autoplay, Keyboard]}
              style={{ width: swiperWidth, maxWidth: '100vw', padding: '20px 0 0 0', marginTop: '-18px' }}
              keyboard={{ enabled: true, onlyInViewport: true }}
              onSwiper={swiper => (swiperRef.current = swiper)}
            >
              {bikes.map((bike, i) => (
                <SwiperSlide key={bike.id}>
                  <div style={{
                    background: '#fff',
                    borderRadius: 18,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    border: '2px solid #1976d2',
                    minWidth: 180,
                    maxWidth: 260,
                    width: '90vw',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 16,
                    margin: '0 auto',
                  }}>
                    <img src="/Bike.jpg" alt={bike.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 16, border: '1.5px solid #eee' }} />
                    <div style={{ fontWeight: 800, fontSize: 22, color: '#1976d2', marginBottom: 8, letterSpacing: 1, textShadow: '0 1px 2px #eee' }}>{bike.name}</div>
                    <div style={{ color: '#555', fontSize: 16, marginBottom: 18, textAlign: 'center' }}>Available for BSU students</div>
                    {/* Amenities section */}
                    <div style={{ color: '#1976d2', fontWeight: 600, fontSize: 15, marginBottom: 10, textAlign: 'center' }}>
                      Amenities
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#444', fontSize: 15, marginBottom: 16, textAlign: 'center' }}>
                      <li>🪖 Helmet</li>
                      <li>🥤 Tumbler</li>
                      <li>🛠️ Air pump</li>
                    </ul>
                    <div style={{ marginBottom: 10, fontWeight: 600, color: bike.status === 'rented' ? '#b22222' : '#22c55e', fontSize: 15, textAlign: 'center' }}>
                      {bike.status === 'rented' ? 'Rented' : 'Available'}
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </>
        )}
      </main>
    </div>
  );
} 