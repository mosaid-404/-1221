import React, { useState, useEffect } from 'react';
import { UserProfile } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import QRDisplay from './components/QRDisplay';
import { Loader2 } from 'lucide-react';
import { onAuthStateChanged } from './services/authService';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((profile) => {
      setUser(profile);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(profile) => setUser(profile)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user.role === 'admin' && <AdminDashboard user={user} />}
      {user.role === 'employee' && <EmployeeDashboard user={user} />}
      {user.role === 'qr_display' && <QRDisplay user={user} />}
    </div>
  );
}
