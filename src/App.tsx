import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { 
  Users, 
  Calendar, 
  ClipboardCheck, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  X,
  Plus,
  Search,
  LayoutDashboard,
  FileBadge,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import Interns from './components/Interns';
import Attendance from './components/Attendance';
import Settings from './components/Settings';

type View = 'dashboard' | 'interns' | 'attendance' | 'settings';

function AppContent() {
  const { user, loading, login, logout, loginWithEmail, registerWithEmail } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loginMode, setLoginMode] = useState<'google' | 'password'>('password');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSuccessMsg('');
    setIsLoggingIn(true);
    try {
      if (authView === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
        setSuccessMsg('สร้างบัญชีสำเร็จ! กำลังเข้าสู่ระบบ...');
        setTimeout(() => {
          loginWithEmail(email, password);
        }, 1500);
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#fdfcfb]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdfcfb] px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-xl shadow-orange-200">
                <Award size={32} />
              </div>
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">InternshipHub</h1>
            <p className="text-gray-500 text-sm">ระบบบริหารจัดการนักศึกษาฝึกงานครบวงจร</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
            <div className="flex gap-4 mb-6 p-1 bg-gray-50 rounded-xl">
              <button 
                onClick={() => { setAuthView('login'); setAuthError(''); }}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  authView === 'login' ? "bg-white text-orange-600 shadow-sm" : "text-gray-400"
                )}
              >
                เข้าสู่ระบบ
              </button>
              <button 
                onClick={() => { setAuthView('register'); setAuthError(''); }}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  authView === 'register' ? "bg-white text-orange-600 shadow-sm" : "text-gray-400"
                )}
              >
                ลงทะเบียน
              </button>
            </div>

            {loginMode === 'password' ? (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">
                    {authView === 'login' ? 'Employee ID / E-mail' : 'ตั้งรหัสพนักงาน / E-mail'}
                  </label>
                  <input 
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm focus:border-orange-500 focus:bg-white focus:outline-none transition-all"
                    placeholder="เช่น 9012844"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">
                    {authView === 'login' ? 'Password' : 'ตั้งรหัสผ่าน'}
                  </label>
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm focus:border-orange-500 focus:bg-white focus:outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                    <p className="text-[11px] text-red-600 font-bold leading-relaxed">{authError}</p>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                    <p className="text-[11px] text-green-600 font-bold leading-relaxed">{successMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-gray-200 transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoggingIn 
                    ? 'กำลังตรวจสอบข้อมูล...' 
                    : (authView === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีผู้ใช้งาน')}
                </button>

                <div className="pt-4 text-center">
                  <button 
                    type="button"
                    onClick={() => setLoginMode('google')}
                    className="text-xs font-bold text-orange-500 hover:underline"
                  >
                    เข้าสู่ระบบด้วย Google แทน
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={login}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-100 bg-white px-6 py-4 font-bold text-gray-700 text-sm transition-all hover:bg-gray-50 active:scale-[0.98] shadow-sm"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="h-5 w-5" />
                  เข้าสู่ระบบด้วย Google
                </button>
                <div className="pt-2 text-center">
                  <button 
                    type="button"
                    onClick={() => setLoginMode('password')}
                    className="text-xs font-bold text-orange-500 hover:underline"
                  >
                    เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="mt-8 text-center text-xs text-gray-400 font-medium italic">
            * หากเพิ่งเปิดใช้งาน Email Login ครั้งแรก <br />คุณอาจต้องสร้างบัญชีใหม่ในระบบหลังบ้านก่อน
          </p>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'หน้าแรก', icon: LayoutDashboard },
    { id: 'interns', label: 'นักศึกษาฝึกงาน', icon: Users },
    { id: 'attendance', label: 'การเช็คชื่อ', icon: Calendar },
    { id: 'settings', label: 'ตั้งค่า', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-[#fdfcfb]">
      {/* Sidebar */}
      <aside 
        className={cn(
          "relative flex h-full flex-col border-r border-gray-100 bg-white transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-100">
            <Award size={20} />
          </div>
          {isSidebarOpen && (
            <span className="text-xl font-bold tracking-tight text-gray-900">InternHub</span>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                currentView === item.id 
                  ? "bg-orange-50 text-orange-600" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon size={22} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <div className="mb-4 flex items-center gap-3 px-2">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              className="h-8 w-8 rounded-full border border-gray-100" 
              alt="Avatar" 
            />
            {isSidebarOpen && (
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-semibold text-gray-900">{user.displayName}</span>
                <span className="truncate text-xs text-gray-500">{user.email}</span>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-sm font-medium">ออกจากระบบ</span>}
          </button>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-4 top-10 flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 shadow-sm transition-colors hover:text-gray-600"
        >
          {isSidebarOpen ? <X size={16} /> : <Plus size={16} className="rotate-45" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-bottom border-gray-100 bg-white/80 px-8 backdrop-blur-md">
          <h2 className="text-2xl font-semibold text-gray-900">
            {menuItems.find(i => i.id === currentView)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="ค้นหาข้อมูล..." 
                className="h-10 w-64 rounded-full border border-gray-100 bg-gray-50 pl-10 pr-4 text-sm focus:border-orange-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100/50"
              />
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 text-gray-500 hover:bg-gray-50">
              <Plus size={20} />
            </button>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'dashboard' && <Dashboard />}
              {currentView === 'interns' && <Interns />}
              {currentView === 'attendance' && <Attendance />}
              {currentView === 'settings' && <Settings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
