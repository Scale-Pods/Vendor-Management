import { useState, useEffect, useCallback } from 'react';
import {
  IconUserPlus,
  IconShieldLock,
  IconTrash,
  IconEye,
  IconEyeOff
} from '@tabler/icons-react';

const FETCH_USERS_URL = `/api/n8n/webhook/${import.meta.env.VITE_N8N_WEBHOOK_USER_FETCH}`;
const MUTATION_URL = `/api/n8n/webhook/${import.meta.env.VITE_N8N_WEBHOOK_USER_MUTATION}`;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUser, setNewUser] = useState({ email: '', role: 'viewer', password: '', sendEmail: true });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    console.log('Fetching users from:', FETCH_USERS_URL);
    try {
      // First try GET
      let response = await fetch(FETCH_USERS_URL + '?action=get_users');
      let json = await response.json();
      
      console.log('Raw Webhook Response:', json);

      // Robust extraction
      let usersList = [];
      if (Array.isArray(json)) {
        if (json[0]?.data && Array.isArray(json[0].data)) {
          usersList = json[0].data;
        } else {
          usersList = json;
        }
      } else if (json?.data && Array.isArray(json.data)) {
        usersList = json.data;
      }

      // If empty, try POST as some n8n webhooks require POST for all actions
      if (usersList.length === 0) {
        console.log('GET returned empty, trying POST...');
        const postResp = await fetch(FETCH_USERS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_users' })
        });
        const postJson = await postResp.json();
        console.log('Raw POST Response:', postJson);
        
        if (Array.isArray(postJson)) {
          usersList = postJson[0]?.data || postJson;
        } else if (postJson?.data) {
          usersList = postJson.data;
        }
      }

      // Map backend fields to UI fields
      const mappedUsers = usersList.map(u => ({
        ...u,
        id: u.id || Math.random(),
        email: u.email || 'unknown@example.com',
        role: (u.status || u.role || 'viewer').toLowerCase(), 
        status: 'active',
        lastLogin: u.Last_Login || u.lastLogin || 'Never'
      }));

      console.log('Mapped Users:', mappedUsers);
      setUsers(mappedUsers);
    } catch (err) {
      console.error('User fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (action, payload) => {
    try {
      const url = `${MUTATION_URL}?action=${action}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) return;
    
    await handleAction('Add', { 
      email: newUser.email, 
      role: newUser.role,
      password: newUser.password,
      sendEmail: newUser.sendEmail,
      status: newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1) // Map role back to "Admin"/"Editor"
    });
    setNewUser({ email: '', role: 'viewer', password: '', sendEmail: true });
    setIsAddingUser(false);
  };

  const changeUserRole = (id, newRole, userObj) => {
    handleAction('Update', { 
      ...userObj, 
      status: newRole.charAt(0).toUpperCase() + newRole.slice(1) 
    });
  };

  const deleteUser = (userObj) => {
    if (window.confirm(`Are you sure you want to remove ${userObj.email}?`)) {
      handleAction('Delete', userObj);
    }
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-6 animate-fade-in max-w-6xl mx-auto text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
            <IconShieldLock className="text-[#F59E0B]" />
            Admin: User Management
          </h1>
          <p className="text-[rgba(255,255,255,0.4)] text-xs sm:text-sm font-medium">
            Control access, assign roles, and pause user accounts.
          </p>
        </div>
        <button 
          onClick={() => setIsAddingUser(!isAddingUser)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold rounded-lg transition-all active:scale-95"
        >
          <IconUserPlus size={18} />
          {isAddingUser ? 'Cancel' : 'Add New User'}
        </button>
      </div>

      {/* Add User Form - Inline Expandable */}
      {isAddingUser && (
        <form onSubmit={handleAddUser} className="glass-panel p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-end gap-3 sm:gap-4 border border-[#F59E0B]/30 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-1 group">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:border-[#F59E0B] outline-none transition-all placeholder:text-[rgba(255,255,255,0.2)]"
              placeholder="e.g. employee@company.com"
            />
          </div>

          <div className="space-y-1 group">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Set Password
            </label>
            <input
              type="text"
              required
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:border-[#F59E0B] outline-none transition-all placeholder:text-[rgba(255,255,255,0.2)]"
              placeholder="Password"
            />
          </div>
          
          <div className="w-full space-y-1 shrink-0">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Role Allocation
            </label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:border-[#F59E0B] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="admin" className="bg-[#0d1117]">Admin (Full Access)</option>
              <option value="editor" className="bg-[#0d1117]">Editor (Write Sheets)</option>
              <option value="viewer" className="bg-[#0d1117]">Viewer (Read Only)</option>
            </select>
          </div>

          <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-start gap-2 mb-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
              Send Mail
            </label>
            <button
              type="button"
              onClick={() => setNewUser({ ...newUser, sendEmail: !newUser.sendEmail })}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
                newUser.sendEmail ? 'bg-[#F59E0B]' : 'bg-[rgba(255,255,255,0.1)]'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  newUser.sendEmail ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button 
            type="submit"
            className="w-full px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest rounded-lg transition-all border border-white/5 h-[44.5px] sm:col-span-2 lg:col-span-1"
          >
            Confirm & Invite
          </button>
        </form>
      )}

      {/* User Table */}
      <div className="glass-panel border-t border-[rgba(255,255,255,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
                <th className="py-4 px-4 sm:px-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">User Account</th>
                <th className="py-4 px-4 sm:px-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Access</th>
                <th className="py-4 px-4 sm:px-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] hidden md:table-cell">Status</th>
                <th className="py-4 px-4 sm:px-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] hidden lg:table-cell">Password</th>
                <th className="py-4 px-4 sm:px-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] hidden sm:table-cell">Last Login</th>
                <th className="py-4 px-4 sm:px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-widest">Fetching user database...</span>
                    </div>
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        user.role === 'admin' ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40' :
                        user.role === 'editor' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                        'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.6)] border border-white/5'
                      }`}>
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] sm:text-[13px] font-medium text-white truncate max-w-[100px] sm:max-w-xs">{user.email}</span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4 sm:px-6">
                    <select
                      value={user.role}
                      onChange={(e) => changeUserRole(user.id, e.target.value, user)}
                      className={`text-[9px] sm:text-[11px] font-black uppercase tracking-wider py-1 px-2 rounded-full border bg-transparent cursor-pointer appearance-none outline-none transition-colors ${
                        user.role === 'admin' ? 'text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/10' :
                        user.role === 'editor' ? 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10' :
                        'text-[rgba(255,255,255,0.4)] border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <option value="admin" className="bg-[#0d1117] text-white">Admin</option>
                      <option value="editor" className="bg-[#0d1117] text-white">Editor</option>
                      <option value="viewer" className="bg-[#0d1117] text-white">Viewer</option>
                    </select>
                  </td>

                  <td className="py-4 px-4 sm:px-6 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                      <span className={`text-[11px] font-black uppercase tracking-tight ${user.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                        {user.status || 'active'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4 sm:px-6 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-mono text-[rgba(255,255,255,0.7)]">
                        {visiblePasswords[user.id] ? (user.password || user.Password || '—') : '••••••••'}
                      </span>
                      <button
                        onClick={() => setVisiblePasswords(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                        className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                      >
                        {visiblePasswords[user.id] ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-[12px] text-[rgba(255,255,255,0.4)] hidden sm:table-cell">
                    {user.lastLogin || 'Never'}
                  </td>
                  
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <div className="flex items-center justify-end">
                      <button 
                        onClick={() => deleteUser(user)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all active:scale-90"
                        title="Delete User"
                      >
                        <IconTrash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
