"use client";

import { useState, useRef } from 'react';
import { apiFetch } from '../../lib/apiClient';
import FaqBot from '../components/FaqBot';

interface ReportIssue {
  subject: string;
  message: string;
  image: File | null;
  priority: 'low' | 'medium' | 'high';
  category: 'technical' | 'bike_damage' | 'safety' | 'other';
  bikeName?: string; // optional; used when reporting bike-related issues
}


export default function HelpCenterPage() {
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState<ReportIssue>({
    subject: '',
    message: '',
    image: null,
    priority: 'medium',
    category: 'other',
    bikeName: ''
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; type: 'success' | 'error'; message: string }>({ visible: false, type: 'success', message: '' });
  const toastTimerRef = useRef<number | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast({ visible: true, type, message });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
      toastTimerRef.current = null;
    }, 3000) as unknown as number;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReportForm(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormChange = (field: keyof ReportIssue, value: string) => {
    setReportForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 1) Upload image if present
      let imageUrl: string | null = null;
      if (reportForm.image) {
        const formData = new FormData();
        formData.append('file', reportForm.image);
        const uploadRes = await apiFetch('/upload-issue', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          const errBody = await uploadRes.json().catch(() => ({}));
          throw new Error(errBody?.error || `Image upload failed (${uploadRes.status})`);
        }
        const uploadJson = await uploadRes.json();
        imageUrl = uploadJson?.imageUrl || null;
      }

      // 2) Submit the report
      const createRes = await apiFetch('/reported-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: reportForm.subject,
          message: reportForm.message,
          category: reportForm.category,
          priority: reportForm.priority,
          imageUrl,
          bikeName: reportForm.bikeName && reportForm.category === 'bike_damage' ? reportForm.bikeName : undefined,
        }),
      });
      if (!createRes.ok) {
        const errBody = await createRes.json().catch(() => ({}));
        throw new Error(errBody?.error || `Submit failed (${createRes.status})`);
      }

      // Reset form
      setReportForm({
        subject: '',
        message: '',
        image: null,
        priority: 'medium',
        category: 'other',
        bikeName: ''
      });
      setImagePreview(null);
      setShowReportForm(false);
      setSuccessOpen(true);
    } catch (error: any) {
      showToast(error?.message || 'Failed to submit report. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeImage = () => {
    setReportForm(prev => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: `url('/car-rental-app.jpg') center center / cover no-repeat fixed`,
      position: 'relative'
    }}>
      {/* Success Modal */}
      {successOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: 16,
          animation: 'fadeIn 200ms ease-out'
        }}>
          <div style={{
            width: '100%',
            maxWidth: 420,
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            padding: 24,
            textAlign: 'center',
            color: '#0f172a',
            animation: 'popIn 220ms cubic-bezier(0.22, 1, 0.36, 1)'
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              margin: '0 auto 16px',
              background: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulseScale 800ms ease-out 120ms both'
            }}>
              <span style={{ fontSize: 36, color: '#10b981', animation: 'checkPop 300ms ease-out 180ms both' }}>✓</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#065f46' }}>Submission Successful!</h3>
            <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: '0 0 16px' }}>
              Thank you for your submission. We have received your information and will process it shortly.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setSuccessOpen(false)}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <a
                href="/home"
                style={{
                  padding: '10px 16px',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                Back to Home
              </a>
            </div>
            <style>{`
              @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
              @keyframes popIn { from { opacity: 0; transform: translateY(8px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
              @keyframes pulseScale { 0% { transform: scale(0.9) } 50% { transform: scale(1.05) } 100% { transform: scale(1) } }
              @keyframes checkPop { from { transform: scale(0.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
            `}</style>
          </div>
        </div>
      )}
      {toast.visible && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          maxWidth: 420,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
          color: toast.type === 'success' ? '#065f46' : '#7f1d1d',
          background: toast.type === 'success' ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)' : 'linear-gradient(135deg,#fee2e2,#fecaca)'
        }}>
          <div style={{ fontSize: 20 }}>
            {toast.type === 'success' ? '✅' : '⚠️'}
          </div>
          <div style={{ flex: 1, fontWeight: 600 }}>{toast.message}</div>
          <button
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            aria-label="Close notification"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        background: 'rgba(80,80,80,0.7)', 
        zIndex: 0, 
        pointerEvents: 'none' 
      }} />
      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        padding: '48px 24px' 
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Page Header */}
        <div style={{ 
          background: 'var(--card-bg)', 
          borderRadius: 16, 
          boxShadow: '0 4px 16px var(--shadow-color)', 
          border: '1px solid var(--border-color)', 
          padding: 32,
          marginBottom: 24,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❓</div>
          <h1 style={{ 
            color: '#1976d2', 
            fontWeight: 800, 
            fontSize: 36, 
            marginBottom: 12 
          }}>
            Help Center
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: 16
          }}>
            Find answers to common questions, report issues, or contact support.
          </p>
        </div>

        {/* Report Issue Section */}
        <div style={{ 
          background: 'var(--card-bg)', 
          borderRadius: 16, 
          border: '1px solid var(--border-color)', 
          padding: 32,
          marginTop: 32,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚨</div>
          <h2 style={{ 
            color: 'var(--text-primary)', 
            fontSize: 24, 
            fontWeight: 700, 
            marginBottom: 12 
          }}>
            Report an Issue
          </h2>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: 16, 
            marginBottom: 24 
          }}>
            Found a problem? Report it to us and we'll help you resolve it quickly.
          </p>
          
          {!showReportForm ? (
            <button
              onClick={() => setShowReportForm(true)}
              style={{
                padding: '12px 24px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
            >
              Report Issue
            </button>
          ) : (
            <form onSubmit={handleSubmitReport} style={{ 
              maxWidth: 600, 
              margin: '0 auto', 
              textAlign: 'left',
              background: 'var(--bg-tertiary)',
              padding: 24,
              borderRadius: 12,
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: 'var(--text-primary)', 
                  marginBottom: 8 
                }}>
                  Subject *
                </label>
                <input
                  type="text"
                  value={reportForm.subject}
                  onChange={(e) => handleFormChange('subject', e.target.value)}
                  placeholder="Brief description of the issue"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 8,
                    fontSize: 16,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: 'var(--text-primary)', 
                  marginBottom: 8 
                }}>
                  Category *
                </label>
                <select
                  value={reportForm.category}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 8,
                    fontSize: 16,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                >
                  <option value="technical">Technical Issue</option>
                  <option value="bike_damage">Bike Damage</option>
                  <option value="safety">Safety Concern</option>
                  <option value="other">Other</option>
                </select>
              </div>

            {reportForm.category === 'bike_damage' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: 'var(--text-primary)', 
                  marginBottom: 8 
                }}>
                  Bike name (e.g., BSU 40) *
                </label>
                <input
                  type="text"
                  value={reportForm.bikeName || ''}
                  onChange={(e) => handleFormChange('bikeName', e.target.value)}
                  placeholder="Enter the bike name on the frame"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 8,
                    fontSize: 16,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                  This helps maintenance link your report to the exact bike.
                </div>
              </div>
            )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: 'var(--text-primary)', 
                  marginBottom: 8 
                }}>
                  Priority *
                </label>
                <select
                  value={reportForm.priority}
                  onChange={(e) => handleFormChange('priority', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 8,
                    fontSize: 16,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: 'var(--text-primary)', 
                  marginBottom: 8 
                }}>
                  Message *
                </label>
                <textarea
                  value={reportForm.message}
                  onChange={(e) => handleFormChange('message', e.target.value)}
                  placeholder="Please provide detailed information about the issue..."
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 8,
                    fontSize: 16,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'border-color 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: 'var(--text-primary)', 
                  marginBottom: 8 
                }}>
                  Attach Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '2px dashed var(--border-color)',
                    borderRadius: 8,
                    fontSize: 14,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                />
                {imagePreview && (
                  <div style={{ marginTop: 12, position: 'relative' }}>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: 200, 
                        borderRadius: 8,
                        border: '1px solid var(--border-color)'
                      }} 
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <div style={{ 
                display: 'flex', 
                gap: 12, 
                justifyContent: 'flex-end' 
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowReportForm(false);
                    setReportForm({
                      subject: '',
                      message: '',
                      image: null,
                      priority: 'medium',
                      category: 'other'
                    });
                    setImagePreview(null);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '2px solid var(--border-color)',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-primary)';
                    e.currentTarget.style.borderColor = 'var(--text-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 24px',
                    background: isSubmitting ? '#94a3b8' : '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Contact Support */}
        <div style={{ 
          background: 'var(--card-bg)', 
          borderRadius: 16, 
          border: '1px solid var(--border-color)', 
          padding: 32,
          marginTop: 32,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
          <h2 style={{ 
            color: 'var(--text-primary)', 
            fontSize: 24, 
            fontWeight: 700, 
            marginBottom: 12 
          }}>
            Still need help?
          </h2>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: 16, 
            marginBottom: 24 
          }}>
            Can't find what you're looking for? Our support team is here to help.
          </p>
           <div style={{ 
             display: 'flex', 
             flexDirection: 'column', 
             gap: 16, 
             alignItems: 'center',
             maxWidth: 400,
             margin: '0 auto'
           }}>
             <div style={{
               display: 'flex',
               alignItems: 'center',
               gap: 12,
               padding: '12px 20px',
               background: 'var(--bg-tertiary)',
               borderRadius: 12,
               border: '1px solid var(--border-color)',
               width: '100%'
             }}>
               <svg width="20" height="20" fill="none" stroke="#1976d2" strokeWidth="2" viewBox="0 0 24 24">
                 <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
               </svg>
               <div>
                 <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Phone</div>
                 <a 
                   href="tel:09694567890"
                   style={{ 
                     fontSize: 16, 
                     fontWeight: 600, 
                     color: '#1976d2', 
                     textDecoration: 'none' 
                   }}
                 >
                   09694567890
                 </a>
               </div>
             </div>
             
             <div style={{
               display: 'flex',
               alignItems: 'center',
               gap: 12,
               padding: '12px 20px',
               background: 'var(--bg-tertiary)',
               borderRadius: 12,
               border: '1px solid var(--border-color)',
               width: '100%'
             }}>
               <svg width="20" height="20" fill="none" stroke="#1976d2" strokeWidth="2" viewBox="0 0 24 24">
                 <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                 <polyline points="22,6 12,13 2,6"/>
               </svg>
               <div>
                 <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Email</div>
                 <a 
                   href="mailto:sdobsulipa@g.batstate-u.edu.ph"
                   style={{ 
                     fontSize: 16, 
                     fontWeight: 600, 
                     color: '#1976d2', 
                     textDecoration: 'none' 
                   }}
                 >
                   sdobsulipa@g.batstate-u.edu.ph
                 </a>
               </div>
             </div>
           </div>
        </div>
        </div>

        {/* Floating FAQ Chatbot (kept) */}
        <FaqBot
          variant="floating"
          onEscalate={({ question, transcript }) => {
            setShowReportForm(true);
            setReportForm(prev => ({
              ...prev,
              subject: question ? `From FAQ: ${question}` : 'From FAQ',
              message: `Support chat transcript:\n${transcript}`,
              category: 'other',
              priority: 'medium'
            }));
            setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
          }}
        />
      </div>
    </div>
  );
}

