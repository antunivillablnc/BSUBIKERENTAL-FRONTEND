"use client";
import styles from "./about.module.css";

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            About Us
          </h1>
          <p className={styles.subtitle}>
            Connect with us for updates, support, and more!
          </p>
          <div className={styles.sections}>
            <div>
              <h2 className={styles.sectionTitle}>Media Links</h2>
              <ul className={styles.list}>
                <li className={styles.listItem}>
                  <a href="https://web.facebook.com/sdo.lipacampus/" target="_blank" rel="noopener noreferrer" className={`${styles.socialLink} ${styles.socialFb}`}>
                    <span className={styles.icon}>📘</span>Facebook
                  </a>
                </li>
                <li className={styles.listItem}>
                  <a href="https://twitter.com/yourpage" target="_blank" rel="noopener noreferrer" className={`${styles.socialLink} ${styles.socialTw}`}>
                    <span className={styles.icon}>🐦</span>Twitter
                  </a>
                </li>
                <li className={styles.listItem}>
                  <a href="https://instagram.com/yourpage" target="_blank" rel="noopener noreferrer" className={`${styles.socialLink} ${styles.socialIg}`}>
                    <span className={styles.icon}>📸</span>Instagram
                  </a>
                </li>
                <li>
                  <a href="https://youtube.com/yourpage" target="_blank" rel="noopener noreferrer" className={`${styles.socialLink} ${styles.socialYt}`}>
                    <span className={styles.icon}>▶️</span>YouTube
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Contact Us</h2>
              <ul className={styles.list}>
                <li className={styles.listItem}>
                  <span className={styles.icon}>✉️</span>Email: <a href="mailto:sdo.lipa@g.batstate-u.edu.ph" className={styles.primaryLink}>sdo.lipa@g.batstate-u.edu.ph</a>
                </li>
                <li>
                  <span className={styles.icon}>📞</span>Phone: <a href="tel:+639123456789" className={styles.primaryLink}>+63 912 345 6789</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 