import React, { useState, useEffect } from 'react';
import { UserProfile, AttendanceRecord, QRToken, SystemSettings } from '../types';
import { logout, updateUserPassword } from '../services/authService';
import { 
  getAttendanceHistory, 
  logAttendance, 
  subscribeToQRToken, 
  getSystemSettings,
  calculateDistance 
} from '../services/attendanceService';
import { 
  History, 
  Scan, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User,
  QrCode,
  MapPin,
  Navigation,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface EmployeeDashboardProps {
  user: UserProfile;
}

export default function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'profile'>('scan');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [qrToken, setQrToken] = useState<QRToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'check-in' | 'check-out' | null>(null);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (isScanning) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [isScanning]);

  function onScanSuccess(decodedText: string) {
    setIsScanning(false);
    if (scanType) {
      handleAttendance(scanType, decodedText);
    }
  }

  function onScanFailure(error: any) {
    // console.warn(`Code scan error = ${error}`);
  }

  const handleAttendance = async (type: 'check-in' | 'check-out', token: string) => {
    setLoading(true);
    setMessage({ text: 'جاري تحديد الموقع...', type: 'info' });
    
    try {
      const loc = await fetchLocation();
      await logAttendance(user.uid, user.username, type, token, loc);
      setMessage({ text: `تم تسجيل ${type === 'check-in' ? 'الحضور' : 'الانصراف'} بنجاح`, type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: err.message || 'خطأ في التسجيل', type: 'error' });
    } finally {
      setLoading(false);
      setScanType(null);
    }
  };

  const fetchLocation = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS غير مدعوم في هذا المتصفح'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
          setCurrentLocation(loc);
          resolve(loc);
        },
        (err) => {
          let errorMsg = 'يرجى تفعيل GPS للمتابعة';
          if (err.code === err.PERMISSION_DENIED) {
            errorMsg = 'تم رفض الوصول إلى الموقع. يرجى تفعيل الصلاحيات من إعدادات المتصفح.';
          } else if (err.code === err.TIMEOUT) {
            errorMsg = 'فشل تحديد الموقع (انتهت المهلة). يرجى المحاولة مرة أخرى في مكان مفتوح.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMsg = 'معلومات الموقع غير متوفرة حالياً.';
          }
          reject(new Error(errorMsg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleAction = async (type: 'check-in' | 'check-out') => {
    setScanType(type);
    setIsScanning(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setMessage({ text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await updateUserPassword(newPassword);
      setMessage({ text: 'تم تغيير كلمة المرور بنجاح', type: 'success' });
      setNewPassword('');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: err.message || 'فشل تغيير كلمة المرور', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">{user.displayName}</h1>
            <p className="text-xs text-gray-500">{user.username}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-all">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 pb-24">
        {activeTab === 'scan' && (
          <div className="max-w-md mx-auto space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center space-y-6">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <QrCode className="w-12 h-12 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">تسجيل الحضور والانصراف</h2>
                <p className="text-sm text-gray-500 mt-2">يجب تفعيل GPS ومسح الكود للمتابعة</p>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl text-sm font-medium ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 
                  message.type === 'info' ? 'bg-blue-50 text-blue-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              {isScanning ? (
                <div className="space-y-4">
                  <div id="reader" className="overflow-hidden rounded-2xl border-2 border-blue-100"></div>
                  <button 
                    onClick={() => { setIsScanning(false); setScanType(null); }}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold"
                  >
                    إلغاء المسح
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleAction('check-in')}
                    disabled={loading}
                    className="flex flex-col items-center gap-3 p-6 bg-green-600 hover:bg-green-700 text-white rounded-2xl transition-all shadow-lg disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-8 h-8" />
                    <span className="font-bold">تسجيل حضور</span>
                  </button>
                  <button
                    onClick={() => handleAction('check-out')}
                    disabled={loading}
                    className="flex flex-col items-center gap-3 p-6 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl transition-all shadow-lg disabled:opacity-50"
                  >
                    <Clock className="w-8 h-8" />
                    <span className="font-bold">تسجيل انصراف</span>
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-gray-50 flex items-center justify-center gap-2 text-xs text-gray-400">
                <MapPin className="w-3 h-3" />
                {currentLocation ? (
                  <span>الموقع محدد بدقة {Math.round(currentLocation.accuracy)}م</span>
                ) : (
                  <span>جاري انتظار تحديد الموقع...</span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">سجلي الشخصي</h2>
            {attendance.map((record) => (
              <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${record.type === 'check-in' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    {record.type === 'check-in' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{record.type === 'check-in' ? 'حضور' : 'انصراف'}</p>
                    <p className="text-xs text-gray-500">
                      {record.timestamp ? format(record.timestamp instanceof Timestamp ? record.timestamp.toDate() : new Date(record.timestamp), 'hh:mm a', { locale: ar }) : '-'}
                    </p>
                  </div>
                </div>
                <div className="text-left flex flex-col items-end gap-1">
                  <p className="text-xs font-medium text-gray-400">
                    {record.timestamp ? format(record.timestamp instanceof Timestamp ? record.timestamp.toDate() : new Date(record.timestamp), 'yyyy/MM/dd', { locale: ar }) : '-'}
                  </p>
                  {record.location && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${record.location.isInsideRange ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-700'}`}>
                      {record.location.isInsideRange ? 'داخل النطاق' : 'خارج النطاق'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {attendance.length === 0 && (
              <div className="text-center py-12 text-gray-400">لا توجد سجلات سابقة</div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center space-y-6">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <User className="w-12 h-12 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">الملف الشخصي</h2>
                <p className="text-sm text-gray-500 mt-2">{user.displayName}</p>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl text-sm font-medium ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 
                  message.type === 'info' ? 'bg-blue-50 text-blue-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 text-right">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تغيير كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="أدخل كلمة المرور الجديدة"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                >
                  {loading ? 'جاري التغيير...' : 'تحديث كلمة المرور'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="bg-white border-t border-gray-100 p-2 flex justify-around items-center fixed bottom-0 left-0 right-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
            activeTab === 'scan' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
          }`}
        >
          <Scan className="w-6 h-6" />
          <span className="text-[10px] font-bold">المسح</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
            activeTab === 'history' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
          }`}
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] font-bold">السجل</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
            activeTab === 'profile' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-bold">الملف</span>
        </button>
      </nav>
    </div>
  );
}
