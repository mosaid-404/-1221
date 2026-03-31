import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { updateQRToken } from '../services/attendanceService';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, RefreshCw, LogOut } from 'lucide-react';
import { logout } from '../services/authService';

interface QRDisplayProps {
  user: UserProfile;
}

export default function QRDisplay({ user }: QRDisplayProps) {
  const [token, setToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);

  const generateToken = () => {
    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setToken(newToken);
    updateQRToken(newToken);
    setTimeLeft(10);
  };

  useEffect(() => {
    generateToken();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateToken();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-8 text-white">
      <div className="absolute top-8 right-8">
        <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-all">
          <LogOut className="w-5 h-5" />
          خروج
        </button>
      </div>

      <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-[0_0_50px_rgba(59,130,246,0.3)] flex flex-col items-center space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">امسح الكود لتسجيل الحضور</h1>
          <p className="text-gray-500 mt-2">يتغير الكود تلقائياً كل 10 ثوانٍ</p>
        </div>

        <div className="p-4 bg-white border-8 border-blue-50 rounded-3xl shadow-inner">
          <QRCodeSVG 
            value={token} 
            size={256} 
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / 10) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-blue-600 font-bold min-w-[60px]">
            <Clock className="w-5 h-5" />
            <span>{timeLeft}ث</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className={`w-4 h-4 ${timeLeft === 10 ? 'animate-spin' : ''}`} />
          <span>جاري تحديث الكود...</span>
        </div>
      </div>

      <div className="mt-12 text-center space-y-2">
        <p className="text-gray-500 text-sm">نظام الحضور الذكي Professional Attendance</p>
        <p className="text-blue-500 font-mono text-xs opacity-50">{token}</p>
      </div>
    </div>
  );
}
