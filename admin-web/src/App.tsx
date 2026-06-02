import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminShops from './pages/AdminShops';
import AdminTemplates from './pages/AdminTemplates';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminAds from './pages/AdminAds';
import AdminAdInquiries from './pages/AdminAdInquiries';
import AdminSettings from './pages/AdminSettings';
import AdminModeration from './pages/AdminModeration';
import AdminLogin from './pages/AdminLogin';
import AdminHomeCampaigns from './pages/AdminHomeCampaigns';
import AdminPairings from './pages/AdminPairings';
import AdminHeroBanner from './pages/AdminHeroBanner';
import AdminFlashDrop from './pages/AdminFlashDrop';
import AdminCoffeeBeans from './pages/AdminCoffeeBeans';
import { Settings, Users, Store, Coffee, ShieldAlert, LayoutDashboard, Megaphone, Target, LogOut, Layout, Image as ImageIcon, Zap, Coins } from 'lucide-react';

const Sidebar = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold">BeanMind Admin</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link to="/" className="flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
        </Link>
        <Link to="/users" className="flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Users className="w-5 h-5 mr-3" /> Users
        </Link>
        <Link to="/shops" className="flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Store className="w-5 h-5 mr-3" /> Shops
        </Link>
        <Link to="/moderation" className="flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <ShieldAlert className="w-5 h-5 mr-3" /> Moderation
        </Link>
        <Link to="/announcements" className="flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Megaphone className="w-5 h-5 mr-3" /> Announcements
        </Link>
        <Link to="/ads" className="flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Target className="w-5 h-5 mr-3" /> Ads Management
        </Link>
        <Link to="/home-campaigns" className="flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors text-amber-400 font-bold bg-gray-800/50">
          <Layout className="w-5 h-5 mr-3" /> Home Campaigns
        </Link>
        <Link to="/hero-banners" className="flex items-center p-3 pl-11 rounded-lg hover:bg-gray-800 transition-colors text-sm">
          Hero Banners
        </Link>
        <Link to="/flash-drops" className="flex items-center p-3 pl-11 rounded-lg hover:bg-gray-800 transition-colors text-sm">
          Flash Drops
        </Link>
        <Link to="/pairings" className="flex items-center p-3 pl-11 rounded-lg hover:bg-gray-800 transition-colors text-sm">
          Coffee Pairings
        </Link>
        <Link to="/ad-inquiries" className="flex items-center p-3 pl-11 rounded-lg hover:bg-gray-800 transition-colors text-sm">
          Ad Inquiries
        </Link>
        <Link to="/templates" className="flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Coffee className="w-5 h-5 mr-3" /> AI Templates
        </Link>
        <Link to="/beans" className="flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Coins className="w-5 h-5 mr-3 text-amber-500" /> Coffee Beans
        </Link>
        <Link to="/settings" className="flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Settings className="w-5 h-5 mr-3" /> Settings
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <button onClick={handleLogout} className="flex items-center p-3 w-full rounded-lg hover:bg-gray-800 transition-colors text-red-400">
          <LogOut className="w-5 h-5 mr-3" /> Logout
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="flex min-h-screen bg-gray-100 font-sans">
              <Sidebar />
              <main className="flex-1 p-8 overflow-y-auto">
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/users" element={<AdminUsers />} />
                  <Route path="/shops" element={<AdminShops />} />
                  <Route path="/templates" element={<AdminTemplates />} />
                  <Route path="/announcements" element={<AdminAnnouncements />} />
                  <Route path="/settings" element={<AdminSettings />} />
                  <Route path="/moderation" element={<AdminModeration />} />
                  <Route path="/beans" element={<AdminCoffeeBeans />} />
                  <Route path="/ads" element={<AdminAds />} />
                  <Route path="/ad-inquiries" element={<AdminAdInquiries />} />
                  <Route path="/home-campaigns" element={<AdminHomeCampaigns />} />
                  <Route path="/pairings" element={<AdminPairings />} />
                  <Route path="/hero-banners" element={<AdminHeroBanner />} />
                  <Route path="/flash-drops" element={<AdminFlashDrop />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
