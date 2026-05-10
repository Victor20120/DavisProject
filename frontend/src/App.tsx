import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import PillCardPage from './pages/PillCardPage';
import Medications from './pages/Medications';
import Family from './pages/Family';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: '#F5F8FF' }}>
        <Sidebar />
        <main className="lg:pl-[240px] min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pill-card" element={<PillCardPage />} />
            <Route path="/medications" element={<Medications />} />
            <Route path="/family" element={<Family />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
