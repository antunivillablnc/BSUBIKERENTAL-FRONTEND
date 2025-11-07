"use client";

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, boxShadow: '0 4px 16px var(--shadow-color)', border: '1px solid var(--border-color)', padding: 32 }}>
          <h1 style={{ color: '#1976d2', fontWeight: 800, fontSize: 32, marginBottom: 24, textAlign: 'center' }}>
            About Us
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18, textAlign: 'center', marginBottom: 32 }}>
            Connect with us for updates, support, and more!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ color: '#1976d2', fontWeight: 700, fontSize: 20, marginBottom: 10 }}>Media Links</h2>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 17 }}>
                <li style={{ marginBottom: 8 }}>
                  <a href="https://web.facebook.com/sdo.lipacampus/" target="_blank" rel="noopener noreferrer" style={{ color: '#1877f3', textDecoration: 'none', fontWeight: 600 }}>
                    <span style={{ marginRight: 8 }}>📘</span>Facebook
                  </a>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <a href="https://twitter.com/yourpage" target="_blank" rel="noopener noreferrer" style={{ color: '#1da1f2', textDecoration: 'none', fontWeight: 600 }}>
                    <span style={{ marginRight: 8 }}>🐦</span>Twitter
                  </a>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <a href="https://instagram.com/yourpage" target="_blank" rel="noopener noreferrer" style={{ color: '#e1306c', textDecoration: 'none', fontWeight: 600 }}>
                    <span style={{ marginRight: 8 }}>📸</span>Instagram
                  </a>
                </li>
                <li>
                  <a href="https://youtube.com/yourpage" target="_blank" rel="noopener noreferrer" style={{ color: '#ff0000', textDecoration: 'none', fontWeight: 600 }}>
                    <span style={{ marginRight: 8 }}>▶️</span>YouTube
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h2 style={{ color: '#1976d2', fontWeight: 700, fontSize: 20, marginBottom: 10 }}>Contact Us</h2>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 17 }}>
                <li style={{ marginBottom: 8 }}>
                  <span style={{ marginRight: 8 }}>✉️</span>Email: <a href="mailto:sdo.lipa@g.batstate-u.edu.ph" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>sdo.lipa@g.batstate-u.edu.ph</a>
                </li>
                <li>
                  <span style={{ marginRight: 8 }}>📞</span>Phone: <a href="tel:+639123456789" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>+63 912 345 6789</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 