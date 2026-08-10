import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { LogIn, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(null);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const from = location.state?.from || '/';

  useEffect(() => {
    let active = true;
    fetch('/api/oauth/config')
      .then(r => r.json())
      .then(cfg => { if (active) setGoogleEnabled(cfg?.google?.configured === true); })
      .catch(() => { if (active) setGoogleEnabled(false); });
    return () => { active = false; };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      addToast('Logged in successfully', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
      addToast(err.message || 'Login failed', 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 400, padding: 40, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>SEO Intel</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            {from && from !== '/' ? 'Sign in to continue to the requested page' : 'Sign in to your account'}
          </div>
        </div>
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--danger-bg, #fee2e2)', color: '#b91c1c', borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', padding: '10px 12px 10px 38px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
                placeholder="you@example.com" />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', padding: '10px 12px 10px 38px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
                placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary"
            style={{ width: '100%', padding: '12px 0', fontSize: 14, marginBottom: 16 }}>
            <LogIn size={16} /> {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          {googleEnabled === true && (
            <>
              <div style={{ position: 'relative', margin: '16px 0' }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--border)' }} />
                <span style={{ position: 'relative', background: 'var(--bg-secondary)', padding: '0 12px', fontSize: 12, color: 'var(--text-secondary)' }}>or</span>
              </div>
              <a href="/api/oauth/google" className="btn btn-outline" style={{ width: '100%', padding: '12px 0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', color: 'var(--text-primary)' }}>
                Continue with Google
              </a>
            </>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent)' }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}
