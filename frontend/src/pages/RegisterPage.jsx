import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register(email, username, password);
      addToast('Account created successfully', 'success');
      navigate('/');
    } catch (err) {
      addToast(err.message || 'Registration failed', 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 400, padding: 40, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>SEO Intel</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Create your account</div>
        </div>
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', padding: '10px 12px 10px 38px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
                placeholder="you@example.com" />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required minLength={3}
                style={{ width: '100%', padding: '10px 12px 10px 38px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
                placeholder="username" />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                style={{ width: '100%', padding: '10px 12px 10px 38px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
                placeholder="Min 8 characters" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary"
            style={{ width: '100%', padding: '12px 0', fontSize: 14, marginBottom: 16 }}>
            <UserPlus size={16} /> {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
