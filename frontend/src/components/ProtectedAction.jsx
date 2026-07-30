import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';

export default function ProtectedAction({ children, requiredRole = 'ADMIN', label = '' }) {
  const { user } = useAuth();
  const roleHierarchy = { ADMIN: 2, VIEWER: 1 };
  const userLevel = roleHierarchy[user?.role] || 1;
  const requiredLevel = roleHierarchy[requiredRole] || 2;
  
  if (userLevel >= requiredLevel) {
    return <>{children}</>;
  }
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} title="🔒 Read-Only Access: Admin privileges required">
      <div style={{ opacity: 0.5, pointerEvents: 'none', filter: 'grayscale(0.5)' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', top: 4, right: 4,
        background: 'rgba(100, 116, 139, 0.9)', color: '#fff',
        fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
        display: 'flex', alignItems: 'center', gap: 3,
      }}>
        <Lock size={9} /> READ ONLY
      </div>
    </div>
  );
}
