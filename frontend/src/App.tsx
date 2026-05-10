import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Home from './pages/Home';
import PillCardPage from './pages/PillCardPage';
import Medications from './pages/Medications';
import Family from './pages/Family';
import Settings from './pages/Settings';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F8FF' }}>
        <svg className="animate-spin" width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="13" stroke="#D6E4F7" strokeWidth="3" />
          <path d="M16 3C8.8 3 3 8.8 3 16" stroke="#185FA5" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppShell() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F8FF' }}>
      <Sidebar />
      <main className="lg:pl-[240px] min-h-screen">
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/pill-card"   element={<PillCardPage />} />
          <Route path="/medications" element={<Medications />} />
          <Route path="/family"      element={<Family />} />
          <Route path="/settings"    element={<Settings />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <AuthGate>
                <AppShell />
              </AuthGate>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
