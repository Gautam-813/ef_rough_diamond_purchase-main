import React, { useState, useEffect } from 'react';
import { api } from './services/api';

export default function AdminPanel({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newUser, setNewUser] = useState({ email: "", password: "", role: "user" });
  const [showAddForm, setShowAddForm] = useState(false);

  const [resetPasswords, setResetPasswords] = useState({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.listUsers();
      setUsers(data);
      setError("");
    } catch (err) {
      setError("Failed to load user list. Access denied?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.signup(newUser.email, newUser.password, newUser.role);
      if (res.detail) {
         alert(`Failed to create user: ${res.detail}`);
         return;
      }
      setNewUser({ email: "", password: "", role: "user" });
      setShowAddForm(false);
      loadUsers();
      alert("User created successfully!");
    } catch (err) {
      alert("Failed to create user. Please check your connection.");
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert("Failed to update role");
    }
  };

  const handleResetPassword = async (userId) => {
    const newPwd = resetPasswords[userId];
    if (!newPwd || newPwd.length < 6) {
       alert("Password must be at least 6 characters");
       return;
    }
    try {
      await api.resetUserPassword(userId, newPwd);
      setResetPasswords({...resetPasswords, [userId]: ""});
      alert("Password reset successfully!");
    } catch (err) {
      alert("Failed to reset password");
    }
  };

  const handleDeleteUser = async (user) => {
    // PROTECTION: Never delete an admin
    if (user.role === 'admin') {
      alert("CRITICAL PROTECTION: Super Admins cannot be deleted from the dashboard for security reasons.");
      return;
    }
    
    if (!confirm(`Are you sure you want to permanently delete user: ${user.email}?`)) return;
    try {
      await api.deleteUser(user.id);
      setUsers(users.filter(u => u.id !== user.id));
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  return (
    <div className="admin-panel-root">
      <div className="section-hdr">
        <div>
          <h2 className="title-glow">User Management & Security</h2>
          <p style={{fontSize:12, opacity:0.6}}>Total Accounts: {users.length}</p>
        </div>
        <div style={{display:'flex', gap:10}}>
          <button className="btn btn-green" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Cancel" : "+ Add New User"}
          </button>
          <button className="btn btn-outline" onClick={onBack}>← Back to Dashboard</button>
        </div>
      </div>

      {showAddForm && (
        <div className="card glass" style={{marginBottom:24, border:'1px solid var(--green)'}}>
          <div className="card-hdr" style={{background:'rgba(22,101,52,0.2)', color:'var(--green)'}}>Register New Team Member</div>
          <form onSubmit={handleAddUser} style={{padding:20, display:'flex', gap:15, alignItems:'flex-end', flexWrap:'wrap'}}>
            <div className="input-group" style={{flex:1, minWidth:200}}>
              <label>Email Address</label>
              <input 
                type="email" 
                className="ef-input" 
                required 
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
              />
            </div>
            <div className="input-group" style={{flex:1, minWidth:150}}>
              <label>Password</label>
              <input 
                type="password" 
                className="ef-input" 
                required 
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
              />
            </div>
            <div className="input-group" style={{width:150}}>
              <label>Role</label>
              <select 
                className="ef-select"
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="user">Standard User</option>
                <option value="admin">Super Admin</option>
                <option value="guest">Guest</option>
              </select>
            </div>
            <button type="submit" className="btn btn-green" style={{height:42}}>Create Account</button>
          </form>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="card glass">
        <div className="card-hdr" style={{background:'#1e1b4b', color:'#fff'}}>Registered Platform Users</div>
        <table className="ef-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined Date</th>
              <th>Reset Password</th>
              <th style={{textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign:'center', padding:40}}>Loading users...</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td className="text-gold" style={{fontWeight:600}}>{u.email}</td>
                  <td>
                    <select 
                      className="ef-select" 
                      style={{padding:'4px 8px', fontSize:12, width:'auto'}}
                      value={u.role} 
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                    >
                      <option value="user">Standard User</option>
                      <option value="admin">Super Admin</option>
                      <option value="guest">Guest (Read-Only)</option>
                    </select>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{display:'flex', gap:5}}>
                      <input 
                        type="password" 
                        className="ef-input-sm" 
                        placeholder="New Password"
                        style={{width:100, fontSize:10, height:28}}
                        value={resetPasswords[u.id] || ""}
                        onChange={(e) => setResetPasswords({...resetPasswords, [u.id]: e.target.value})}
                      />
                      <button className="btn-sm btn-outline" style={{fontSize:10, height:28}} onClick={() => handleResetPassword(u.id)}>Reset</button>
                    </div>
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button 
                      className="btn-sm" 
                      style={{background:'rgba(248,113,113,0.1)', color:'#f87171', border:'1px solid #f87171'}}
                      onClick={() => handleDeleteUser(u)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan="6" style={{textAlign:'center', padding:40, opacity:0.5}}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-tips" style={{marginTop:20, opacity:0.6, fontSize:12}}>
        <p>• Super Admins can manage all notebooks and access this control panel.</p>
        <p>• Removing a user will not delete the notebooks they created unless you delete them separately.</p>
      </div>
    </div>
  );
}
