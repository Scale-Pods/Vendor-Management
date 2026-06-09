import { useState, useEffect, useCallback } from 'react';
import {
  IconUserPlus,
  IconShieldLock,
  IconTrash,
  IconEye,
  IconEyeOff
} from '@tabler/icons-react';

const FETCH_USERS_URL = '/api/n8n/webhook/fccc9ea9-d7ea-4dff-a95c-b9031990d5ff';
const MUTATION_URL = '/api/n8n/webhook/24a10bda-d61b-4355-b26e-594726a2ec93';

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
    <div className="p-8 space-y-6 animate-fade-in max-w-6xl mx-auto text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
            <IconShieldLock className="text-[#F59E0B]" />
            Admin: User Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Control access, assign roles, and pause user accounts.
          </p>
        </div>
        <button 
          onClick={() => setIsAddingUser(!isAddingUser)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-black font-semibold rounded-lg transition-colors"
        >
          <IconUserPlus size={18} />
          {isAddingUser ? 'Cancel' : 'Add New User'}
        </button>
      </div>

      {/* Add User Form - Inline Expandable */}
      {isAddingUser && (
        <form onSubmit={handleAddUser} className="glass-panel p-6 grid grid-cols-1 md:grid-cols-5 items-end gap-4 border border-[#F59E0B]/30 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-1 group">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full bg-[rgba(255,255,255,0.05)] border border-border rounded-lg py-2.5 px-4 text-sm text-white focus:ring-1 focus:ring-[#F59E0B] outline-none transition-all placeholder:text-[rgba(255,255,255,0.2)]"
              placeholder="e.g. employee@company.com"
            />
          </div>

          <div className="space-y-1 group">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Set Password
            </label>
            <input
              type="text"
              required
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full bg-[rgba(255,255,255,0.05)] border border-border rounded-lg py-2.5 px-4 text-sm text-white focus:ring-1 focus:ring-[#F59E0B] outline-none transition-all placeholder:text-[rgba(255,255,255,0.2)]"
              placeholder="Password"
            />
          </div>
          
          <div className="w-full space-y-1 shrink-0">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Role Allocation
            </label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full bg-[rgba(255,255,255,0.05)] border border-border rounded-lg py-2.5 px-4 text-sm text-white focus:ring-1 focus:ring-[#F59E0B] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="admin" className="bg-background">Admin (Full Access)</option>
              <option value="editor" className="bg-background">Editor (Write Sheets)</option>
              <option value="viewer" className="bg-background">Viewer (Read Only)</option>
            </select>
          </div>

          <div className="flex flex-col items-center gap-2 mb-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
              Send Mail
            </label>
            <button
              type="button"
              onClick={() => setNewUser({ ...newUser, sendEmail: !newUser.sendEmail })}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out flex items-center ${
                newUser.sendEmail ? 'bg-[#F59E0B]' : 'bg-[rgba(255,255,255,0.1)]'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  newUser.sendEmail ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button 
            type="submit"
            className="w-full px-6 py-2.5 bg-border hover:bg-[rgba(255,255,255,0.15)] text-white font-medium rounded-lg transition-colors border border-[rgba(255,255,255,0.05)] h-[44.5px]"
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
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">User Account</th>
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Access Level</th>
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Status</th>
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Password</th>
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Last Login</th>
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] text-right">Actions</th>
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
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        user.role === 'admin' ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40' :
                        user.role === 'editor' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                        'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.6)] border border-border'
                      }`}>
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[13px] font-medium text-white">{user.email}</span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <select
                      value={user.role}
                      onChange={(e) => changeUserRole(user.id, e.target.value, user)}
                      className={`text-[11px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-full border bg-transparent cursor-pointer appearance-none outline-none transition-colors ${
                        user.role === 'admin' ? 'text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/10' :
                        user.role === 'editor' ? 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10' :
                        'text-muted-foreground border-border hover:bg-[rgba(255,255,255,0.05)]'
                      }`}
                    >
                      <option value="admin" className="bg-background text-white">Admin</option>
                      <option value="editor" className="bg-background text-white">Editor</option>
                      <option value="viewer" className="bg-background text-white">Viewer</option>
                    </select>
                  </td>

                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                      <span className={`text-[12px] font-medium ${user.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                        {(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-mono text-[rgba(255,255,255,0.7)]">
                        {visiblePasswords[user.id] ? (user.password || user.Password || '—') : '••••••••'}
                      </span>
                      <button
                        onClick={() => setVisiblePasswords(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                        className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] text-muted-foreground hover:text-white transition-colors"
                        title={visiblePasswords[user.id] ? 'Hide Password' : 'Show Password'}
                      >
                        {visiblePasswords[user.id] ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[12px] text-[rgba(255,255,255,0.4)]">
                    {user.lastLogin || 'Never'}
                  </td>
                  
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => deleteUser(user)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Delete User"
                      >
                        <IconTrash size={16} />
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
