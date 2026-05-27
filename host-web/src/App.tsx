import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HostLogin from './pages/HostLogin';
import HostDashboard from './pages/HostDashboard';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }
  
  try {
    const user = JSON.parse(userStr);
    const role = (user.role || '').toUpperCase();
    // 점주(OWNER) 또는 관리자(ADMIN) 권한 체크
    if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'HOST') {
      // 일반 사용자는 접근 불가
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return <Navigate to="/login" replace />;
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<HostLogin />} />
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <Routes>
                <Route path="/" element={<HostDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
