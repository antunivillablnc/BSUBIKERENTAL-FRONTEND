"use client";
import { useState, useEffect, useRef } from "react";

interface Bike {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  applications?: any[];
}

export default function AdminBikesPage() {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addName, setAddName] = useState("");
  const [addStatus, setAddStatus] = useState("available");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [sortField, setSortField] = useState<'status' | 'name' | 'date'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'rented'>('all');

  // Custom dropdown for status filter
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'available', label: 'Available' },
    { value: 'rented', label: 'Rented' },
  ];
  const selectedStatus = statusOptions.find(opt => opt.value === statusFilter)?.label || 'All';

  useEffect(() => {
    fetchBikes();
  }, []);

  const fetchBikes = async () => {
    try {
      const response = await fetch("/api/admin/bikes");
      const data = await response.json();
      
      if (data.success) {
        setBikes(data.bikes);
      } else {
        setError("Failed to fetch bikes");
      }
    } catch (err) {
      setError("Failed to fetch bikes");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBike = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!addName.trim()) {
      setAddError("Plate number is required.");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/bikes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), status: addStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setAddName("");
        setAddStatus("available");
        fetchBikes();
      } else {
        setAddError(data.error || "Failed to add bike.");
      }
    } catch {
      setAddError("Failed to add bike.");
    }
    setAddLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "#22c55e";
      case "rented":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Available";
      case "rented":
        return "Rented";
      default:
        return status;
    }
  };

  // Sort bikes based on selected field and order
  const sortedBikes = [...bikes].sort((a, b) => {
    if (sortField === 'status') {
      // Available first, then rented
      if (a.status === b.status) return 0;
      return sortOrder === 'asc'
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
    if (sortField === 'name') {
      return sortOrder === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    if (sortField === 'date') {
      return sortOrder === 'asc'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  // Filter bikes by status
  const filteredBikes = statusFilter === 'all' ? sortedBikes : sortedBikes.filter(b => b.status === statusFilter);

  // Modal state for renter info
  const [modalBike, setModalBike] = useState<Bike | null>(null);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#1976d2', marginBottom: 16 }}>Loading bikes...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px 0 rgba(31,38,135,0.15)', border: '2px solid #e0e0e0', padding: 40 }}>
          <h1 style={{ color: '#1976d2', fontWeight: 800, fontSize: 32, marginBottom: 32, textAlign: 'center' }}>
            Bike Inventory Management
          </h1>
          
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: 16, borderRadius: 8, marginBottom: 24 }}>
              {error}
            </div>
          )}

          {/* Summary Card - moved to top */}
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <div style={{ background: '#f0f8ff', padding: 28, borderRadius: 14, border: '2px solid #b6d4fa', boxShadow: '0 2px 12px 0 rgba(31,38,135,0.07)' }}>
              <h3 style={{ color: '#1976d2', fontWeight: 600, marginBottom: 8 }}>
                Summary
              </h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 24 }}>
                    {bikes.filter(b => b.status === 'available').length}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 14 }}>Available</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 24 }}>
                    {bikes.filter(b => b.status === 'rented').length}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 14 }}>Rented</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#1976d2', fontWeight: 700, fontSize: 24 }}>
                    {bikes.length}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 14 }}>Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Add Bike Form */}
          <form onSubmit={handleAddBike} style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            <input
              type="text"
              placeholder="Plate Number (e.g. BSU 011)"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #e0e0e0',
                fontSize: 16,
                minWidth: 180,
                outline: 'none',
                fontFamily: 'inherit',
                background: '#fff',
                color: '#222',
              }}
              disabled={addLoading}
            />
            <select
              value={addStatus}
              onChange={e => setAddStatus(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #e0e0e0',
                fontSize: 16,
                outline: 'none',
                fontFamily: 'inherit',
                background: '#fff',
                color: '#222',
              }}
              disabled={addLoading}
            >
              <option value="available">Available</option>
              <option value="rented">Rented</option>
            </select>
            <button
              type="submit"
              style={{
                background: '#1976d2',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                letterSpacing: 0.1,
              }}
              disabled={addLoading}
            >
              {addLoading ? 'Adding...' : 'Add Bike'}
            </button>
            {addError && <span style={{ color: '#b22222', fontWeight: 600, fontSize: 15 }}>{addError}</span>}
          </form>

          {/* Filter and Sorting Controls - aligned horizontally */}
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 24, marginTop: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
              <label style={{ fontWeight: 700, color: '#1976d2', fontSize: 16 }}>Show:</label>
              {/* Custom Dropdown */}
              <div
                ref={dropdownRef}
                tabIndex={0}
                style={{ 
                  position: 'relative',
                  minWidth: 90,
                  userSelect: 'none',
                  outline: 'none',
                }}
                onClick={() => setShowDropdown(v => !v)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') setShowDropdown(v => !v);
                  if (e.key === 'Escape') setShowDropdown(false);
                }}
                aria-haspopup="listbox"
                aria-expanded={showDropdown}
              >
                <div style={{
                  padding: '8px 24px 8px 16px',
                  borderRadius: 12, 
                  border: '1.5px solid #e0e0e0',
                  fontSize: 16,
                  background: '#fff',
                  color: '#1976d2',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minWidth: 90,
                  boxShadow: showDropdown ? '0 2px 8px rgba(178,34,34,0.10)' : 'none',
                  transition: 'box-shadow 0.15s',
                }}>
                  {selectedStatus}
                  <span style={{ marginLeft: 8, fontSize: 18, color: '#b22222' }}>{showDropdown ? '▲' : '▼'}</span>
                </div>
                {showDropdown && (
                  <div
                    role="listbox"
                    style={{
                      position: 'absolute',
                      top: '110%',
                      left: 0,
                      background: '#fff',
                      border: '1.5px solid #e0e0e0',
                      borderRadius: 12,
                      boxShadow: '0 4px 16px rgba(178,34,34,0.10)',
                      zIndex: 10,
                      minWidth: 120,
                    }}
                  >
                    {statusOptions.map(opt => (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={statusFilter === opt.value}
                        tabIndex={0}
                        onClick={e => {
                          setStatusFilter(opt.value as typeof statusFilter);
                          setShowDropdown(false);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setStatusFilter(opt.value as typeof statusFilter);
                            setShowDropdown(false);
                          }
                        }}
                        style={{
                          padding: '10px 18px',
                          color: '#1976d2',
                          fontWeight: statusFilter === opt.value ? 800 : 600,
                          background: statusFilter === opt.value ? '#fbeaea' : '#fff',
                          cursor: 'pointer',
                          borderRadius: 8,
                          fontSize: 16,
                        }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontWeight: 700, color: '#1976d2', fontSize: 16 }}>Sort by:</label>
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as typeof sortField)}
                style={{
                  padding: '8px 24px 8px 16px',
                  borderRadius: 12,
                  border: '1.5px solid #e0e0e0',
                  fontSize: 16,
                  background: '#fff',
                  color: '#1976d2',
                  fontWeight: 700,
                  outline: 'none',
                  boxShadow: 'none',
                  appearance: 'none',
                  minWidth: 120,
                  cursor: 'pointer',
                }}
              >
                <option value="status">Status</option>
                <option value="name">Name</option>
                <option value="date">Date Added</option>
              </select>
              {(sortField === 'name' || sortField === 'date' || sortField === 'status') && (
                <button
                  type="button"
                  onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                  style={{
                    background: '#fff',
                    border: '1.5px solid #e0e0e0',
                    borderRadius: 10,
                    padding: '8px 16px',
                    fontWeight: 600,
                    fontSize: 16,
                    cursor: 'pointer',
                    color: '#1976d2',
                    outline: 'none',
                    boxShadow: 'none',
                    marginLeft: 2,
                  }}
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            {filteredBikes.map((bike) => {
              const isRented = bike.status === 'rented' && bike.applications && bike.applications.length > 0;
              return (
                <div
                  key={bike.id}
                  style={{
                    border: '2px solid #d1d5db',
                    borderRadius: 14,
                    padding: 24,
                    background: '#f8fafc',
                    boxShadow: '0 2px 12px 0 rgba(31,38,135,0.07)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'box-shadow 0.2s',
                    cursor: isRented ? 'pointer' : 'default',
                    position: 'relative',
                  }}
                  onClick={() => isRented && setModalBike(bike)}
                  tabIndex={isRented ? 0 : -1}
                  onKeyDown={e => {
                    if (isRented && (e.key === 'Enter' || e.key === ' ')) setModalBike(bike);
                  }}
                  aria-label={isRented ? 'Show renter information' : undefined}
              >
                <div>
                  <h3 style={{ color: '#111827', fontWeight: 600, fontSize: 18, marginBottom: 4 }}>
                    {bike.name}
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                    Added: {new Date(bike.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {bike.status === "rented" && bike.applications && bike.applications.length > 0 ? (
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 16 }}>Rented</span>
                  ) : (
                      <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 16 }}>Available</span>
                  )}
                  {bike.applications && bike.applications.length > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#1976d2', fontWeight: 600, fontSize: 16 }}>
                        {bike.applications.length}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>
                        Application{bike.applications.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>

          {/* Modal for renter info */}
          {modalBike && modalBike.applications && modalBike.applications.length > 0 && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.25)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => setModalBike(null)}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '32px 28px',
                  minWidth: 320,
                  maxWidth: '90vw',
                  boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)',
                  position: 'relative',
                }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setModalBike(null)}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'none',
                    border: 'none',
                    fontSize: 22,
                    color: '#b22222',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
                <h2 style={{ color: '#b22222', fontWeight: 800, fontSize: 22, marginBottom: 18, textAlign: 'center' }}>
                  Renter Information
                </h2>
                <div style={{ color: '#222', fontWeight: 700, fontSize: 18, marginBottom: 6, textAlign: 'center' }}>
                  {modalBike.applications[0].firstName} {modalBike.applications[0].lastName}
                  </div>
                <div style={{ color: '#1976d2', fontSize: 16, textAlign: 'center', marginBottom: 12 }}>
                  {modalBike.applications[0].email}
                </div>
                <div style={{ color: '#6b7280', fontSize: 15, textAlign: 'center' }}>
                  Bike: <span style={{ color: '#b22222', fontWeight: 700 }}>{modalBike.name}</span>
                </div>
                <div style={{ color: '#6b7280', fontSize: 15, textAlign: 'center', marginTop: 4 }}>
                  Assigned: {new Date(modalBike.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 