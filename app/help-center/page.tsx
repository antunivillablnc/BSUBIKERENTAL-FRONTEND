"use client";

import { useState } from 'react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ReportIssue {
  subject: string;
  message: string;
  image: File | null;
  priority: 'low' | 'medium' | 'high';
  category: 'technical' | 'bike_damage' | 'safety' | 'other';
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'How do I register for the bike rental system?',
    answer: 'To register, click on the "Register" button on the homepage and fill out the registration form with your information. You\'ll need to provide your email, and other required details. Once submitted, your application will be reviewed by the admin team.',
    category: 'Registration'
  },
  {
    id: '2',
    question: 'How long does the application approval process take?',
    answer: 'Application approval typically takes 1-3 business days. You\'ll receive an notification on the app once your application has been reviewed. You can also check your application status in your dashboard.',
    category: 'Registration'
  },
  {
    id: '3',
    question: 'What documents do I need to register?',
    answer: 'You need a Certificate of Indigency, General Weighted Average, Extra Curricular Activities, and Income Tax Return.',
    category: 'Registration'
  },
  {
    id: '4',
    question: 'Can I register if I\'m not a current student?',
    answer: 'The bike rental system is exclusively for current students, teacher and staff of the university.',
    category: 'Registration'
  },
  {
    id: '5',
    question: 'How do I rent a bike?',
    answer: 'Once your application is approved, your bike will be assigned to you and you can pick it up from SDO CECS building.',
    category: 'Reservations'
  },
  {
    id: '6',
    question: 'Can I rent multiple bikes at once?',
    answer: 'No, each student can only rent one bike at a time. This policy ensures that bikes are available for as many students as possible.',
    category: 'Reservations'
  },
  {
    id: '7',
    question: 'How do I cancel my rent?',
    answer: 'You can cancel a rent through returning the bike to the same location where you picked it up.',
    category: 'Reservations'
  },
  {
    id: '8',
    question: 'Where can I pick up and return bikes?',
    answer: 'Bikes can be picked up and returned at SDO CECS building. Always return bikes to the same location where you picked them up.',
    category: 'Locations'
  },
  {
    id: '9',
    question: 'What are the operating hours for bike pickup and return?',
    answer: 'Bikes can be picked up and returned during campus hours, typically from 7:00 AM to 4:00 PM.',
    category: 'Locations'
  },
  {
    id: '10',
    question: 'What should I do if a bike is damaged or not working?',
    answer: 'If you encounter a damaged or non-functional bike, please report it immediately through the "Report Issue" feature in your "Help Center" or contact the staff. Do not attempt to use a damaged bike as it may be unsafe.',
    category: 'Issues'
  },
  {
    id: '11',
    question: 'What if I lose or damage a bike during my rental?',
    answer: 'Report any loss or damage immediately to the staff. You may be responsible for repair costs or replacement fees. Contact support as soon as possible to discuss the situation.',
    category: 'Issues'
  },
  {
    id: '12',
    question: 'How do I report a technical issue with the system?',
    answer: 'Use the "Report Issue" feature in your "Help Center" or contact support directly. Provide as much detail as possible about the problem you\'re experiencing.',
    category: 'Issues'
  },
  {
    id: '13',
    question: 'Can I extend my rental period?',
    answer: 'No, you cannot extend your rental period because the bike is assigned to you for a specific period you may apply again for a new application.',
    category: 'Rental Management'
  },
  {
    id: '14',
    question: 'What happens if I return a bike late?',
    answer: 'Late returns may result in penalties or temporary suspension of rental privileges. The system tracks rental periods automatically. Please try to return bikes on time to maintain good standing.',
    category: 'Rental Management'
  },
  {
    id: '15',
    question: 'What safety equipment is provided with bikes?',
    answer: 'Each bike comes with a helmet and basic safety equipment. Helmets are mandatory for all riders. Additional safety gear may be available like tumbler and air pump at pickup locations.',
    category: 'Safety'
  },
  {
    id: '16',
    question: 'Are there any safety rules I need to follow?',
    answer: 'Yes, you must wear a helmet at all times, follow traffic rules, and ride responsibly. No riding under the influence of alcohol or drugs. Always check the bike before riding.',
    category: 'Safety'
  },
  {
    id: '17',
    question: 'What should I do in case of an accident?',
    answer: 'In case of an accident, prioritize your safety first. Contact emergency services if needed, then report the incident to the bike rental staff immediately. Do not leave the scene without proper documentation.',
    category: 'Safety'
  },
  {
    id: '18',
    question: 'Is there a mobile app available?',
    answer: 'Currently, the bike rental system is accessible through the web interface, which is mobile-responsive. A dedicated mobile app may be available in the future. The web version works well on smartphones and tablets.',
    category: 'Technical'
  },
  {
    id: '19',
    question: 'What browsers are supported?',
    answer: 'The system works best with modern browsers including Chrome, Firefox, Safari, and Edge. Make sure your browser is updated to the latest version for the best experience.',
    category: 'Technical'
  },
  {
    id: '20',
    question: 'What if I forget my password?',
    answer: 'Use the "Forgot Password" link on the login page to reset your password. You\'ll receive an email with instructions to create a new password.',
    category: 'Technical'
  },
  {
    id: '21',
    question: 'How do I update my profile information?',
    answer: 'You can update your profile information through the "Profile Settings" section in your dashboard.',
    category: 'Account Management'
  },
  {
    id: '22',
    question: 'Can I change my email address?',
    answer: 'Yes, you can update your email address in your profile settings.',
    category: 'Account Management'
  },
  {
    id: '23',
    question: 'How do I deactivate my account?',
    answer: 'Contact support to request account deactivation. Make sure to return any active rentals and clear any outstanding issues before deactivation.',
    category: 'Account Management'
  },
  {
    id: '24',
    question: 'How do I contact support?',
    answer: 'You can contact support through the phone number (09694567890) or email (sdobsulipa@g.batstate-u.edu.ph) provided in the contact section. Response times are typically within 24 hours during business days.',
    category: 'Support'
  },
  {
    id: '25',
    question: 'What are the support hours?',
    answer: 'Support is available during business hours, Monday through Friday, 8:00 AM to 5:00 PM. For urgent issues outside these hours, use the emergency contact number.',
    category: 'Support'
  }
];

const categories = ['All', 'Registration', 'Reservations', 'Locations', 'Issues', 'Rental Management', 'Safety', 'Technical', 'Account Management', 'Support'];

export default function HelpCenterPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState<ReportIssue>({
    subject: '',
    message: '',
    image: null,
    priority: 'medium',
    category: 'other'
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset form
      setReportForm({
        subject: '',
        message: '',
        image: null,
        priority: 'medium',
        category: 'other'
      });
      setImagePreview(null);
      setShowReportForm(false);
      
      alert('Issue reported successfully! We will get back to you soon.');
    } catch (error) {
      alert('Failed to submit report. Please try again.');
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
        {/* Header */}
        <div style={{ 
          background: 'var(--card-bg)', 
          borderRadius: 16, 
          boxShadow: '0 4px 16px var(--shadow-color)', 
          border: '1px solid var(--border-color)', 
          padding: 32,
          marginBottom: 32,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❓</div>
          <h1 style={{ 
            color: '#1976d2', 
            fontWeight: 800, 
            fontSize: 36, 
            marginBottom: 16 
          }}>
            Help Center
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: 18, 
            marginBottom: 24 
          }}>
            Find answers to common questions about our bike rental system
          </p>
          
          {/* Search Bar */}
          <div style={{ 
            maxWidth: 500, 
            margin: '0 auto',
            position: 'relative'
          }}>
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                border: '2px solid var(--border-color)',
                borderRadius: 12,
                fontSize: 16,
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#1976d2'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
            <svg 
              width="20" 
              height="20" 
              fill="none" 
              stroke="var(--text-muted)" 
              strokeWidth="2" 
              viewBox="0 0 24 24"
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }}
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        {/* Category Filter */}
        <div style={{ 
          background: 'var(--card-bg)', 
          borderRadius: 12, 
          border: '1px solid var(--border-color)', 
          padding: 20,
          marginBottom: 24
        }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontSize: 18, 
            fontWeight: 600, 
            marginBottom: 16 
          }}>
            Categories
          </h3>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 8 
          }}>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: 'none',
                  background: selectedCategory === category ? '#1976d2' : 'var(--bg-tertiary)',
                  color: selectedCategory === category ? '#fff' : 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== category) {
                    e.currentTarget.style.background = 'var(--bg-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== category) {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div style={{ 
          background: 'var(--card-bg)', 
          borderRadius: 16, 
          border: '1px solid var(--border-color)', 
          overflow: 'hidden'
        }}>
          {filteredFAQs.length === 0 ? (
            <div style={{ 
              padding: 48, 
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>No FAQs found</h3>
              <p>Try adjusting your search or category filter</p>
            </div>
          ) : (
            filteredFAQs.map((faq, index) => (
              <div
                key={faq.id}
                style={{
                  borderBottom: index < filteredFAQs.length - 1 ? '1px solid var(--border-color)' : 'none'
                }}
              >
                <button
                  onClick={() => toggleExpanded(faq.id)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 12, 
                      marginBottom: 4 
                    }}>
                      <span style={{
                        background: '#1976d2',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: 12
                      }}>
                        {faq.category}
                      </span>
                    </div>
                    <h3 style={{ 
                      color: 'var(--text-primary)', 
                      fontSize: 16, 
                      fontWeight: 600,
                      margin: 0
                    }}>
                      {faq.question}
                    </h3>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="var(--text-muted)"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    style={{
                      transform: expandedItems.includes(faq.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <path d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                
                {expandedItems.includes(faq.id) && (
                  <div style={{ 
                    padding: '0 24px 20px 24px',
                    background: 'var(--bg-tertiary)'
                  }}>
                    <p style={{ 
                      color: 'var(--text-secondary)', 
                      fontSize: 15, 
                      lineHeight: 1.6,
                      margin: 0
                    }}>
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
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
      </div>
    </div>
  );
}

