"use client";

import { useState, useEffect } from 'react';

interface ReportedIssue {
  id: string;
  subject: string;
  message: string;
  category: 'technical' | 'bike_damage' | 'safety' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  imageUrl?: string;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  resolvedAt?: string;
  adminNotes?: string;
}

// Mock data - in a real app, this would come from your backend
const mockIssues: ReportedIssue[] = [
  {
    id: '1',
    subject: 'Bike chain keeps falling off',
    message: 'The bike I rented yesterday has a loose chain that keeps falling off while riding. This is very dangerous and needs immediate attention.',
    category: 'bike_damage',
    priority: 'high',
    status: 'open',
    imageUrl: '/uploads/bike-chain-issue.jpg',
    reportedBy: 'john.doe@student.batstate-u.edu.ph',
    reportedAt: '2025-01-15T10:30:00Z',
  },
  {
    id: '2',
    subject: 'Cannot login to dashboard',
    message: 'I keep getting an error message when trying to log into my dashboard. The error says "Invalid credentials" but I know my password is correct.',
    category: 'technical',
    priority: 'medium',
    status: 'in_progress',
    reportedBy: 'jane.smith@student.batstate-u.edu.ph',
    reportedAt: '2025-01-14T15:45:00Z',
    assignedTo: 'admin@batstate-u.edu.ph',
  },
  {
    id: '3',
    subject: 'Broken brake on bike #BSU-045',
    message: 'The front brake on bike BSU-045 is not working properly. It makes a grinding noise and doesn\'t stop the bike effectively.',
    category: 'safety',
    priority: 'high',
    status: 'resolved',
    imageUrl: '/uploads/broken-brake.jpg',
    reportedBy: 'mike.wilson@student.batstate-u.edu.ph',
    reportedAt: '2025-01-13T09:15:00Z',
    assignedTo: 'admin@batstate-u.edu.ph',
    resolvedAt: '2025-01-14T11:30:00Z',
    adminNotes: 'Brake pads replaced and brake cable adjusted. Bike is now safe to use.',
  },
  {
    id: '4',
    subject: 'App crashes when viewing map',
    message: 'The mobile app crashes every time I try to view the bike map. This happens on both Android and iOS devices.',
    category: 'technical',
    priority: 'medium',
    status: 'open',
    reportedBy: 'sarah.jones@student.batstate-u.edu.ph',
    reportedAt: '2025-01-12T14:20:00Z',
  },
];

export default function AdminReportedIssuesPage() {
  const [issues, setIssues] = useState<ReportedIssue[]>(mockIssues);
  const [selectedIssue, setSelectedIssue] = useState<ReportedIssue | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');

  const filteredIssues = issues.filter(issue => {
    const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || issue.priority === filterPriority;
    const matchesCategory = filterCategory === 'all' || issue.category === filterCategory;
    const matchesSearch = issue.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         issue.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         issue.reportedBy.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesCategory && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#dc2626';
      case 'in_progress': return '#f59e0b';
      case 'resolved': return '#22c55e';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return '💻';
      case 'bike_damage': return '🚲';
      case 'safety': return '⚠️';
      case 'other': return '📝';
      default: return '📝';
    }
  };

  const handleStatusUpdate = (issueId: string, status: string, notes?: string) => {
    setIssues(prev => prev.map(issue => {
      if (issue.id === issueId) {
        return {
          ...issue,
          status: status as any,
          adminNotes: notes || issue.adminNotes,
          resolvedAt: status === 'resolved' ? new Date().toISOString() : issue.resolvedAt,
          assignedTo: status !== 'open' ? 'admin@batstate-u.edu.ph' : issue.assignedTo
        };
      }
      return issue;
    }));
    setShowModal(false);
    setSelectedIssue(null);
    setAdminNotes('');
    setNewStatus('');
  };

  const openModal = (issue: ReportedIssue) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setAdminNotes(issue.adminNotes || '');
    setShowModal(true);
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
        background: 'rgba(80,80,80,0.75)', 
        zIndex: 0, 
        pointerEvents: 'none' 
      }} />
      
      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        padding: '32px 24px' 
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.95) 0%, rgba(13, 71, 161, 0.95) 100%)',
            borderRadius: 20, 
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            padding: '48px 32px',
            marginBottom: 32,
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
              background: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
              pointerEvents: 'none'
            }} />
            <div style={{ 
              fontSize: 64, 
              marginBottom: 20,
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
              position: 'relative',
              zIndex: 1
            }}>🚨</div>
            <h1 style={{ 
              color: '#ffffff', 
              fontWeight: 800, 
              fontSize: 42, 
              marginBottom: 16,
              textShadow: '0 2px 16px rgba(0, 0, 0, 0.3)',
              letterSpacing: '-0.5px',
              position: 'relative',
              zIndex: 1
            }}>
              Reported Issues
            </h1>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.95)', 
              fontSize: 18, 
              marginBottom: 32,
              fontWeight: 500,
              position: 'relative',
              zIndex: 1
            }}>
              Manage and resolve user-reported issues
            </p>
            
            {/* Search and Filters */}
            <div style={{ 
              display: 'flex', 
              gap: 12, 
              justifyContent: 'center', 
              flexWrap: 'wrap',
              maxWidth: 900,
              margin: '0 auto',
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <input
                  type="text"
                  placeholder="Search issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 12,
                    fontSize: 15,
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#1e293b',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    fontWeight: 500
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#ffffff';
                    e.target.style.background = '#ffffff';
                    e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }}
                />
                <svg 
                  width="20" 
                  height="20" 
                  fill="none" 
                  stroke="#64748b" 
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
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '14px 16px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  fontSize: 15,
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#1e293b',
                  outline: 'none',
                  minWidth: 140,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  fontWeight: 500
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffffff';
                  e.target.style.background = '#ffffff';
                  e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                style={{
                  padding: '14px 16px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  fontSize: 15,
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#1e293b',
                  outline: 'none',
                  minWidth: 140,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  fontWeight: 500
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffffff';
                  e.target.style.background = '#ffffff';
                  e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  padding: '14px 16px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  fontSize: 15,
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#1e293b',
                  outline: 'none',
                  minWidth: 150,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  fontWeight: 500
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffffff';
                  e.target.style.background = '#ffffff';
                  e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical</option>
                <option value="bike_damage">Bike Damage</option>
                <option value="safety">Safety</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Issues List */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.98)', 
            borderRadius: 20, 
            border: '1px solid rgba(0, 0, 0, 0.08)', 
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
          }}>
            {filteredIssues.length === 0 ? (
              <div style={{ 
                padding: 48, 
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <h3 style={{ fontSize: 20, marginBottom: 8 }}>No issues found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              filteredIssues.map((issue, index) => (
                <div
                  key={issue.id}
                  style={{
                    borderBottom: index < filteredIssues.length - 1 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none',
                    padding: '24px 28px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, rgba(25, 118, 210, 0.04), rgba(25, 118, 210, 0.02))';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                  onClick={() => openModal(issue)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{ 
                          fontSize: 24,
                          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                        }}>{getCategoryIcon(issue.category)}</span>
                        <h3 style={{ 
                          color: '#1e293b', 
                          fontSize: 19, 
                          fontWeight: 700,
                          margin: 0,
                          letterSpacing: '-0.3px'
                        }}>
                          {issue.subject}
                        </h3>
                        <span style={{
                          background: getPriorityColor(issue.priority),
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: 20,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                        }}>
                          {issue.priority}
                        </span>
                        <span style={{
                          background: getStatusColor(issue.status),
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: 20,
                          textTransform: 'capitalize',
                          letterSpacing: '0.3px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                        }}>
                          {issue.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p style={{ 
                        color: '#475569', 
                        fontSize: 15, 
                        lineHeight: 1.6,
                        margin: '0 0 14px 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontWeight: 400
                      }}>
                        {issue.message}
                      </p>
                      <div style={{ 
                        display: 'flex', 
                        gap: 12, 
                        fontSize: 13, 
                        color: '#64748b',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 600 }}>👤 {issue.reportedBy.split('@')[0]}</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontWeight: 500 }}>📅 {new Date(issue.reportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {issue.assignedTo && (
                          <>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ fontWeight: 500 }}>🔧 Assigned</span>
                          </>
                        )}
                      </div>
                    </div>
                    {issue.imageUrl && (
                      <div style={{ marginLeft: 20, flexShrink: 0 }}>
                        <img 
                          src={issue.imageUrl} 
                          alt="Issue" 
                          style={{ 
                            width: 80, 
                            height: 80, 
                            objectFit: 'cover',
                            borderRadius: 12,
                            border: '2px solid rgba(0, 0, 0, 0.08)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            transition: 'transform 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedIssue && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: 16,
            padding: 32,
            maxWidth: 600,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ 
                color: 'var(--text-primary)', 
                fontSize: 24, 
                fontWeight: 700,
                margin: 0
              }}>
                Issue Details
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{getCategoryIcon(selectedIssue.category)}</span>
                <h3 style={{ 
                  color: 'var(--text-primary)', 
                  fontSize: 20, 
                  fontWeight: 600,
                  margin: 0
                }}>
                  {selectedIssue.subject}
                </h3>
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <span style={{
                  background: getPriorityColor(selectedIssue.priority),
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 12,
                  textTransform: 'uppercase'
                }}>
                  {selectedIssue.priority}
                </span>
                <span style={{
                  background: getStatusColor(selectedIssue.status),
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 12,
                  textTransform: 'capitalize'
                }}>
                  {selectedIssue.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ 
                color: 'var(--text-primary)', 
                fontSize: 16, 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Description
              </h4>
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: 14, 
                lineHeight: 1.6,
                margin: 0
              }}>
                {selectedIssue.message}
              </p>
            </div>

            {selectedIssue.imageUrl && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ 
                  color: 'var(--text-primary)', 
                  fontSize: 16, 
                  fontWeight: 600,
                  marginBottom: 8
                }}>
                  Attached Image
                </h4>
                <img 
                  src={selectedIssue.imageUrl} 
                  alt="Issue" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: 300, 
                    borderRadius: 8,
                    border: '1px solid var(--border-color)'
                  }} 
                />
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ 
                color: 'var(--text-primary)', 
                fontSize: 16, 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Issue Information
              </h4>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <p><strong>Reported by:</strong> {selectedIssue.reportedBy}</p>
                <p><strong>Reported at:</strong> {new Date(selectedIssue.reportedAt).toLocaleString()}</p>
                {selectedIssue.assignedTo && (
                  <p><strong>Assigned to:</strong> {selectedIssue.assignedTo}</p>
                )}
                {selectedIssue.resolvedAt && (
                  <p><strong>Resolved at:</strong> {new Date(selectedIssue.resolvedAt).toLocaleString()}</p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h4 style={{ 
                color: 'var(--text-primary)', 
                fontSize: 16, 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Update Status
              </h4>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid var(--border-color)',
                  borderRadius: 8,
                  fontSize: 16,
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  marginBottom: 12
                }}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add admin notes or resolution details..."
                rows={3}
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
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ 
              display: 'flex', 
              gap: 12, 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => setShowModal(false)}
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
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedIssue.id, newStatus, adminNotes)}
                style={{
                  padding: '12px 24px',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
