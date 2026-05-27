import { useState } from 'react';
import { IconMail, IconLock, IconLoader2, IconAlertCircle, IconArrowRight } from '@tabler/icons-react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ action: 'validate', email, password });
      const response = await fetch(`/api/n8n/webhook/fccc9ea9-d7ea-4dff-a95c-b9031990d5ff?${params}`);
      const data = await response.json();
      console.log('Login response:', data);

      // Extract user record from { data: [{...}] }
      let user = null;
      if (data?.data?.[0]?.email) {
        user = data.data[0];
      } else if (Array.isArray(data) && data[0]?.data?.[0]?.email) {
        user = data[0].data[0];
      } else if (Array.isArray(data) && data[0]?.email) {
        user = data[0];
      }

      if (user) {
        const role = (user.status || 'viewer').toLowerCase();
        onLogin({ email: user.email, role });
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#F59E0B] opacity-[0.08] blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D97706] opacity-[0.05] blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="glass-panel p-10 space-y-8 relative overflow-hidden backdrop-blur-[32px]">
          {/* Top subtle glow */}
          <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#F59E0B]/30 to-transparent" />
          
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-2xl bg-linear-to-br from-[#F59E0B]/20 to-[#D97706]/10 border border-[#F59E0B]/20 shadow-2xl">
                <img
                  src="/scalepods-logo.png"
                  alt="ScalePods"
                  className="h-8 w-auto filter invert brightness-200"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">PRIME HORIZON</h1>
            <p className="text-[rgba(255,255,255,0.4)] text-xs">CONSTRUCTION L.L.C</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2 group">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.25)] ml-1 transition-colors group-focus-within:text-[#F59E0B]">
                  Corporate Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-label group-focus-within:text-[#F59E0B] transition-colors">
                    <IconMail size={18} stroke={1.5} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full bg-sidebar border border-[rgba(255,255,255,0.08)] rounded-xl py-3.5 pl-11 pr-4 text-[14px] text-white placeholder:text-[rgba(255,255,255,0.15)] focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B]/40 focus:bg-[rgba(255,255,255,0.05)] transition-all outline-none"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2 group">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.25)] ml-1 transition-colors group-focus-within:text-[#F59E0B]">
                  Security Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-label group-focus-within:text-[#F59E0B] transition-colors">
                    <IconLock size={18} stroke={1.5} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full bg-sidebar border border-[rgba(255,255,255,0.08)] rounded-xl py-3.5 pl-11 pr-4 text-[14px] text-white placeholder:text-[rgba(255,255,255,0.15)] focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B]/40 focus:bg-[rgba(255,255,255,0.05)] transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs animate-in fade-in slide-in-from-top-1 duration-300">
                <IconAlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[rgba(255,255,255,0.05)] disabled:text-[rgba(255,255,255,0.2)] text-black font-semibold py-3.5 rounded-xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            >
              <div className="absolute inset-0 w-1/2 h-full bg-linear-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] translate-x-[-150%] group-hover:translate-x-[250%] transition-transform duration-700 pointer-events-none" />
              
              {loading ? (
                <IconLoader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <IconArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <footer className="pt-2 text-center">
            <p className="text-[10px] text-[rgba(255,255,255,0.2)] font-medium uppercase tracking-[2px]">
              Advanced Intelligence Systems
            </p>
          </footer>
        </div>
      </div>

      {/* Decorative Blob */}
      <div className="fixed -bottom-32 -left-32 w-96 h-96 bg-[rgba(245,158,11,0.03)] rounded-full blur-[80px]" />
    </div>
  );
};

export default Login;
