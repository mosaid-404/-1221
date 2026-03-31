import React, { useState, useEffect } from 'react';
import { UserProfile, AttendanceRecord, SystemSettings, UserRole } from '../types';
import { 
  logout, 
  deleteEmployee, 
  updateEmployeePermissions,
  createEmployee,
  updateUserPassword
} from '../services/authService';
import { getAllAttendance, updateSystemSettings, getSystemSettings } from '../services/attendanceService';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, collection, Timestamp } from 'firebase/firestore';
import { 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  CheckCircle2, 
  XCircle,
  UserPlus,
  MapPin,
  Navigation,
  ExternalLink,
  Globe,
  Trash2,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AdminDashboardProps {
  user: UserProfile;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'employees' | 'reports' | 'settings'>('employees');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [newEmployee, setNewEmployee] = useState({ username: '', displayName: '', password: '' });
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState<SystemSettings>({
    companyLocation: { lat: 0, lng: 0, radius: 100 }
  });

  useEffect(() => {
    const unsubAttendance = getAllAttendance(setAttendance);
    const unsubEmployees = onSnapshot(collection(db, 'users'), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => doc.data() as UserProfile));
    });
    
    getSystemSettings().then(s => {
      if (s) setSettings(s);
    });
    
    return () => {
      unsubAttendance();
      unsubEmployees();
    };
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await createEmployee(newEmployee.username, newEmployee.displayName, newEmployee.password);
      setMessage('تم إضافة الموظف بنجاح');
      setNewEmployee({ username: '', displayName: '', password: '' });
    } catch (err: any) {
      setMessage(`خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (uid: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
      await deleteEmployee(uid);
    }
  };

  const togglePermission = async (uid: string, field: keyof UserProfile['permissions']) => {
    const emp = employees.find(e => e.uid === uid);
    if (emp) {
      const newPerms = { ...emp.permissions, [field]: !emp.permissions?.[field] };
      await updateEmployeePermissions(uid, newPerms);
    }
  };

  const changeRole = async (uid: string, role: UserRole) => {
    await updateDoc(doc(db, 'users', uid), { role });
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateSystemSettings(settings);
      alert('تم تحديث الإعدادات بنجاح');
    } catch (err) {
      alert('خطأ في تحديث الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword || adminPassword.length < 6) {
      alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setLoading(true);
    try {
      await updateUserPassword(adminPassword);
      alert('تم تغيير كلمة المرور بنجاح');
      setAdminPassword('');
    } catch (err: any) {
      alert(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setSettings({
          ...settings,
          companyLocation: {
            ...settings.companyLocation,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }
        });
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50" dir="rtl">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            لوحة الإدارة
          </h1>
          <p className="text-xs text-gray-400 mt-1">مرحباً، {user.displayName}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('employees')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'employees' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5" />
            الموظفين
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'reports' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-5 h-5" />
            التقارير
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Globe className="w-5 h-5" />
            إعدادات الموقع
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'employees' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <UserPlus className="text-blue-600" />
                إضافة موظف جديد
              </h2>
              <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اسم المستخدم (للدخول)</label>
                  <input
                    type="text"
                    value={newEmployee.username}
                    onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="مثال: emp001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
                  <input
                    type="text"
                    value={newEmployee.displayName}
                    onChange={(e) => setNewEmployee({ ...newEmployee, displayName: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="مثال: محمد أحمد"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
                  <input
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="أدخل كلمة المرور"
                    required
                    minLength={6}
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'جاري الإضافة...' : 'إضافة الموظف'}
                  </button>
                </div>
              </form>
              {message && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('خطأ') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {message}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">قائمة الموظفين</h3>
              </div>
              <table className="w-full text-right">
                <thead className="bg-gray-50 text-gray-500 text-sm">
                  <tr>
                    <th className="px-6 py-4 font-medium">الموظف</th>
                    <th className="px-6 py-4 font-medium">البريد الإلكتروني</th>
                    <th className="px-6 py-4 font-medium">الدور</th>
                    <th className="px-6 py-4 font-medium">الصلاحيات</th>
                    <th className="px-6 py-4 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employees.map((emp) => (
                    <tr key={emp.uid} className="hover:bg-gray-50 transition-all">
                      <td className="px-6 py-4 font-medium text-gray-900">{emp.displayName}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{emp.username}</td>
                      <td className="px-6 py-4">
                        <select 
                          value={emp.role}
                          onChange={(e) => changeRole(emp.uid, e.target.value as UserRole)}
                          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none"
                        >
                          <option value="admin">مدير</option>
                          <option value="employee">موظف</option>
                          <option value="qr_display">شاشة كود</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteEmployee(emp.uid)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">سجل الحضور والانصراف العام</h2>
              <div className="flex gap-4">
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  داخل النطاق: {attendance.filter(r => r.location?.isInsideRange).length}
                </div>
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  خارج النطاق: {attendance.filter(r => r.location && !r.location.isInsideRange).length}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-gray-50 text-gray-500 text-sm">
                  <tr>
                    <th className="px-6 py-4 font-medium">الموظف</th>
                    <th className="px-6 py-4 font-medium">التاريخ والوقت</th>
                    <th className="px-6 py-4 font-medium">النوع</th>
                    <th className="px-6 py-4 font-medium">الموقع</th>
                    <th className="px-6 py-4 font-medium">الخريطة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-all">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{record.username}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {record.timestamp ? format(record.timestamp instanceof Timestamp ? record.timestamp.toDate() : new Date(record.timestamp), 'yyyy/MM/dd hh:mm a', { locale: ar }) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          record.type === 'check-in' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                        }`}>
                          {record.type === 'check-in' ? 'حضور' : 'انصراف'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {record.location ? (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            record.location.isInsideRange ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {record.location.isInsideRange ? 'داخل الشركة' : 'خارج النطاق'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">بدون موقع</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {record.location && (
                          <a 
                            href={`https://www.google.com/maps?q=${record.location.lat},${record.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                          >
                            <ExternalLink className="w-3 h-3" />
                            عرض
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MapPin className="text-blue-600" />
                إعدادات موقع الشركة (Geofencing)
              </h2>
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">خط العرض (Latitude)</label>
                    <input
                      type="number"
                      step="any"
                      value={settings.companyLocation.lat}
                      onChange={(e) => setSettings({
                        ...settings,
                        companyLocation: { ...settings.companyLocation, lat: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">خط الطول (Longitude)</label>
                    <input
                      type="number"
                      step="any"
                      value={settings.companyLocation.lng}
                      onChange={(e) => setSettings({
                        ...settings,
                        companyLocation: { ...settings.companyLocation, lng: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نصف قطر النطاق (بالمتر)</label>
                  <input
                    type="number"
                    value={settings.companyLocation.radius}
                    onChange={(e) => setSettings({
                      ...settings,
                      companyLocation: { ...settings.companyLocation, radius: parseInt(e.target.value) }
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-5 h-5" />
                    تحديد موقعي الحالي
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md"
                  >
                    حفظ الإعدادات
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mt-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Lock className="text-blue-600 w-6 h-6" />
                تغيير كلمة مرور المدير
              </h2>
              <form onSubmit={handleChangeAdminPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="أدخل كلمة المرور الجديدة"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                >
                  {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
