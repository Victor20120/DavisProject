import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import PillCardPage from './pages/PillCardPage';
import Medications from './pages/Medications';
import Family from './pages/Family';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import JoinFamily from './pages/JoinFamily';
import { getUserProfile } from './database/firestore';

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

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid)
      .then(profile => {
        setNeedsOnboarding(!profile?.onboardingComplete);
        setChecking(false);
      })
      .catch(() => { setNeedsOnboarding(true); setChecking(false); });
  }, [user]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F8FF' }}>
        <svg className="animate-spin" width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="13" stroke="#D6E4F7" strokeWidth="3" />
          <path d="M16 3C8.8 3 3 8.8 3 16" stroke="#185FA5" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
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
          <Route path="/profile"     element={<Profile />} />
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
          <Route path="/join/:token" element={<JoinFamily />} />
          <Route
            path="/onboarding"
            element={
              <AuthGate>
                <Onboarding />
              </AuthGate>
            }
          />
          <Route
            path="/*"
            element={
              <AuthGate>
                <OnboardingGate>
                  <AppShell />
                </OnboardingGate>
              </AuthGate>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
