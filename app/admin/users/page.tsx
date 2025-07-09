"use client";
import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface UserFormData {
  email: string;
  password: string;
  name: string;
  role: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    password: "",
    name: "",
    role: "user"
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      } else {
        setError("Failed to fetch users");
      }
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      name: "",
      role: "user"
    });
    setFormError("");
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    if (!formData.email || !formData.password || !formData.name || !formData.role) {
      setFormError("All fields are required.");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        resetForm();
        setShowAddForm(false);
        fetchUsers();
      } else {
        setFormError(data.error || "Failed to add user.");
      }
    } catch {
      setFormError("Failed to add user.");
    }
    setFormLoading(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setFormError("");
    
    if (!formData.email || !formData.name || !formData.role) {
      setFormError("Email, name, and role are required.");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          email: formData.email,
          password: formData.password || undefined,
          name: formData.name,
          role: formData.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        resetForm();
        setEditingUser(null);
        fetchUsers();
      } else {
        setFormError(data.error || "Failed to update user.");
      }
    } catch {
      setFormError("Failed to update user.");
    }
    setFormLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    setDeletingUserId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || "Failed to delete user.");
      }
    } catch {
      alert("Failed to delete user.");
    }
    setDeletingUserId(null);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      name: user.name,
      role: user.role
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "#dc2626";
      case "user":
        return "#1976d2";
      default:
        return "#6b7280";
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#1976d2', marginBottom: 16 }}>Loading users...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px 0 rgba(31,38,135,0.15)', border: '2px solid #e0e0e0', padding: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h1 style={{ color: '#1976d2', fontWeight: 800, fontSize: 32, margin: 0 }}>
              User Account Management
            </h1>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                background: '#1976d2',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              + Add User
            </button>
          </div>
          
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: 16, borderRadius: 8, marginBottom: 24 }}>
              {error}
            </div>
          )}

          {/* Users Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '16px', color: '#374151', fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '16px', color: '#374151', fontWeight: 600 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '16px', color: '#374151', fontWeight: 600 }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '16px', color: '#374151', fontWeight: 600 }}>Created</th>
                  <th style={{ textAlign: 'center', padding: '16px', color: '#374151', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '16px', color: '#111827', fontWeight: 500 }}>{user.name}</td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>{user.email}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: `${getRoleColor(user.role)}20`,
                        color: getRoleColor(user.role),
                        textTransform: 'capitalize'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: 14 }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button
                          onClick={() => openEditModal(user)}
                          style={{
                            background: '#1976d2',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={deletingUserId === user.id}
                          style={{
                            background: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>No users found. Add your first user account.</p>
            </div>
          )}

          {/* Add User Modal */}
          {showAddForm && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 16,
                padding: '32px',
                minWidth: 400,
                maxWidth: '90vw',
                boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)',
              }}>
                <h2 style={{ color: '#1976d2', fontWeight: 800, fontSize: 24, marginBottom: 24, textAlign: 'center' }}>
                  Add New User
                </h2>
                
                {formError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    {formError}
                  </div>
                )}

                <form onSubmit={handleAddUser}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 16,
                        background: '#fff',
                        color: '#111', // set font color to black
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 16,
                        background: '#fff',
                        color: '#111', // set font color to black
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 16,
                        background: '#fff',
                        color: '#111', // set font color to black
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                      Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 16,
                        background: '#fff', // white background
                        color: '#111', // black font
                      }}
                      required
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      style={{
                        background: '#6b7280',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 24px',
                        cursor: 'pointer',
                        fontSize: 16,
                        fontWeight: 600
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      style={{
                        background: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 24px',
                        cursor: 'pointer',
                        fontSize: 16,
                        fontWeight: 600
                      }}
                    >
                      {formLoading ? 'Adding...' : 'Add User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {editingUser && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 16,
                padding: '32px',
                minWidth: 400,
                maxWidth: '90vw',
                boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)',
              }}>
                <h2 style={{ color: '#1976d2', fontWeight: 800, fontSize: 24, marginBottom: 24, textAlign: 'center' }}>
                  Edit User
                </h2>
                
                {formError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    {formError}
                  </div>
                )}

                <form onSubmit={handleUpdateUser}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 16,
                        background: '#fff', // changed to white
                        color: '#111', // set font color to black
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 16,
                        background: '#fff', // changed to white
                        color: '#111', // set font color to black
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                      Password (leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 16,
                        background: '#fff', // changed to white
                        color: '#111', // set font color to black
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                      Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 16,
                        background: '#fff', // white background
                        color: '#111', // black font
                      }}
                      required
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      style={{
                        background: '#6b7280',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 24px',
                        cursor: 'pointer',
                        fontSize: 16,
                        fontWeight: 600
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      style={{
                        background: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 24px',
                        cursor: 'pointer',
                        fontSize: 16,
                        fontWeight: 600
                      }}
                    >
                      {formLoading ? 'Updating...' : 'Update User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 