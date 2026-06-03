import React, { useState, useEffect, Suspense } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Coffee, Map, User, MessageSquare, Home, Users } from 'lucide-react';
const HomeDashboard = React.lazy(() => import('./pages/Home'));
const Curator = React.lazy(() => import('./pages/Curator'));
const CoffeeTalk = React.lazy(() => import('./pages/CoffeeTalk'));
const Profile = React.lazy(() => import('./pages/Profile'));
const RegisterShop = React.lazy(() => import('./pages/RegisterShop'));
const PrescriptionHistory = React.lazy(() => import('./pages/PrescriptionHistory'));
const SavedShops = React.lazy(() => import('./pages/SavedShops'));
const ManageShop = React.lazy(() => import('./pages/ManageShop'));
const ShopBrowser = React.lazy(() => import('./pages/ShopBrowser'));
const BookmarkedPosts = React.lazy(() => import('./pages/BookmarkedPosts'));
const PointHistory = React.lazy(() => import('./pages/PointHistory'));
const ActivityHistory = React.lazy(() => import('./pages/ActivityHistory'));
const CoursePlaylists = React.lazy(() => import('./pages/CoursePlaylists'));
const ClubList = React.lazy(() => import('./pages/ClubList'));
const ClubDetail = React.lazy(() => import('./pages/ClubDetail'));
const TastingNoteWizard = React.lazy(() => import('./pages/TastingNoteWizard'));
const TourRouteWizard = React.lazy(() => import('./pages/TourRouteWizard'));
const HostWebDashboard = React.lazy(() => import('./pages/HostWebDashboard'));
import { useTranslation } from 'react-i18next';

// Bottom Navigation Component
const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;

  const safeGetSession = () => { try { return !!localStorage.getItem('token'); } catch { return false; } };
  const [isLoggedIn, setIsLoggedIn] = React.useState(safeGetSession());

  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    const handleAuthChange = () => setIsLoggedIn(safeGetSession());
    window.addEventListener('authStateChanged', handleAuthChange);

    const handleFocusIn = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const type = (target as HTMLInputElement).type;
        if (type !== 'checkbox' && type !== 'radio' && type !== 'submit' && type !== 'button' && type !== 'file') {
          setIsKeyboardVisible(true);
        }
      }
    };
    const handleFocusOut = () => setIsKeyboardVisible(false);

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Hide bottom nav on specific pages
  if (currentPath.startsWith('/register') || currentPath.startsWith('/admin') || currentPath.startsWith('/profile/host-web')) return null;

  const handleNavClick = (e: React.MouseEvent, targetPath: string) => {
    // If clicking the current tab, trigger scroll to top
    if (
      (targetPath === '/' && currentPath === '/') ||
      (targetPath !== '/' && currentPath.startsWith(targetPath))
    ) {
      e.preventDefault(); // Prevent re-navigation flicker
      window.dispatchEvent(new Event('scrollToTop'));
    }
  };

  return (
    <div className="fixed bottom-0 w-full md:w-[72px] md:h-full md:left-0 md:top-0 md:flex-col md:justify-center md:border-t-0 md:border-r bg-espresso-900/95 backdrop-blur-xl border-t border-espresso-700/80 flex justify-around items-center px-4 py-3 pb-safe md:py-8 md:gap-8 z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] md:shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
      <Link to="/" onClick={(e) => handleNavClick(e, '/')} className={`flex flex-col items-center gap-1.5 transition-all flex-1 md:flex-none py-1.5 md:w-full rounded-2xl ${currentPath === '/' ? 'text-amber-500 bg-amber-900/30' : 'text-espresso-200 hover:text-espresso-50 hover:bg-espresso-800/50'}`}>
        <Home size={24} strokeWidth={currentPath === '/' ? 2.5 : 2} />
        <span className="text-[10px] font-bold font-mono tracking-widest text-center whitespace-nowrap">{t('app.nav_home', '홈')}</span>
      </Link>
      <Link to="/community" onClick={(e) => handleNavClick(e, '/community')} className={`flex flex-col items-center gap-1.5 transition-all flex-1 md:flex-none py-1.5 md:w-full rounded-2xl ${currentPath.startsWith('/community') ? 'text-amber-500 bg-amber-900/30' : 'text-espresso-200 hover:text-espresso-50 hover:bg-espresso-800/50'}`}>
        <MessageSquare size={24} strokeWidth={currentPath.startsWith('/community') ? 2.5 : 2} />
        <span className="text-[10px] font-bold font-mono tracking-widest text-center whitespace-nowrap">{t('app.nav_community', '커피톡')}</span>
      </Link>
      <Link to="/clubs" onClick={(e) => handleNavClick(e, '/clubs')} className={`flex flex-col items-center gap-1.5 transition-all flex-1 md:flex-none py-1.5 md:w-full rounded-2xl ${currentPath.startsWith('/clubs') ? 'text-amber-500 bg-amber-900/30' : 'text-espresso-200 hover:text-espresso-50 hover:bg-espresso-800/50'}`}>
        <Users size={24} strokeWidth={currentPath.startsWith('/clubs') ? 2.5 : 2} />
        <span className="text-[10px] font-bold font-mono tracking-widest text-center whitespace-nowrap">{t('app.nav_clubs')}</span>
      </Link>
      <Link to="/map" onClick={(e) => handleNavClick(e, '/map')} className={`flex flex-col items-center gap-1.5 transition-all flex-1 md:flex-none py-1.5 md:w-full rounded-2xl ${currentPath === '/map' ? 'text-amber-500 bg-amber-900/30' : 'text-espresso-200 hover:text-espresso-50 hover:bg-espresso-800/50'}`}>
        <Map size={24} strokeWidth={currentPath === '/map' ? 2.5 : 2} />
        <span className="text-[10px] font-bold font-mono tracking-widest text-center whitespace-nowrap">{t('app.nav_map', '커피맵')}</span>
      </Link>
      <Link to="/profile" onClick={(e) => handleNavClick(e, '/profile')} className={`flex flex-col items-center gap-1.5 transition-all flex-1 md:flex-none py-1.5 md:w-full rounded-2xl ${currentPath.startsWith('/profile') ? 'text-amber-500 bg-amber-900/30' : 'text-espresso-200 hover:text-espresso-50 hover:bg-espresso-800/50'}`}>
        <User size={24} strokeWidth={currentPath.startsWith('/profile') ? 2.5 : 2} />
        <span className="text-[10px] font-bold font-mono tracking-widest text-center whitespace-nowrap">{isLoggedIn ? t('profile.title', '내 정보') : t('app.nav_login', '로그인')}</span>
      </Link>
    </div>
  );
};

import { v4 as uuidv4 } from 'uuid';
import { API_BASE } from './utils/apiConfig';
import { usePushNotifications } from './hooks/usePushNotifications';
import GlobalAdBanner from './components/GlobalAdBanner';
import SystemNoticePopup from './components/SystemNoticePopup';

// Global tracking variable to prevent duplicate deep link handling
let lastHandledLaunchUrl = '';

// Root Layout Component
const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const hideBottomNav = location.pathname.startsWith('/register') || location.pathname.startsWith('/admin') || location.pathname.startsWith('/profile/host-web');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    let isMounted = true;
    let listenerHandle: any = null;

    const setupDeepLink = async () => {
      const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();
      if (!isNative) return;

      try {
        const { App: CapacitorApp } = await import('@capacitor/app');
        
        const launchUrl = await CapacitorApp.getLaunchUrl();
        if (launchUrl && launchUrl.url && isMounted) {
          handleDeepLink(launchUrl.url);
        }

        if (!isMounted) return;

        listenerHandle = await CapacitorApp.addListener('appUrlOpen', (event: any) => {
          if (isMounted) {
            handleDeepLink(event.url);
          }
        });
      } catch (err) {
        console.error('Capacitor App deep link error:', err);
      }
    };

    const handleDeepLink = (url: string) => {
      if (lastHandledLaunchUrl === url) {
        console.log('Deep link already handled, skipping:', url);
        return;
      }
      lastHandledLaunchUrl = url;

      try {
        let targetUrl = url;
        if (targetUrl.startsWith('capcurator://')) {
          targetUrl = targetUrl.replace('capcurator://', 'http://localhost/');
        }
        const parsedUrl = new URL(targetUrl);
        const activePost = parsedUrl.searchParams.get('activePost');
        
        if ((parsedUrl.pathname === '/community' || parsedUrl.host === 'community') && activePost) {
          navigate('/community', { state: { activePost } });
        }
      } catch (err) {
        console.error('Failed to handle deep link url:', url, err);
      }
    };

    setupDeepLink();

    return () => {
      isMounted = false;
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate]);

  useEffect(() => {
    // If user is unauthenticated and tries to access a protected route (or just whenever they open the app unauthenticated), 
    // force them to the home page (Curator) if they are not already there or on a public safe page.
    const isAuth = !!localStorage.getItem('token');
    const isPublicRoute = location.pathname === '/' ||
      location.pathname.startsWith('/curator') ||
      location.pathname.startsWith('/community') ||
      location.pathname.startsWith('/clubs') ||
      location.pathname.startsWith('/map') ||
      location.pathname.startsWith('/course') ||
      location.pathname === '/profile' ||
      location.pathname === '/register';

    if (!isAuth && !isPublicRoute) {
      navigate('/community', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Sync language on initial load if logged in
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.preferredLanguage && i18n.language !== user.preferredLanguage) {
          i18n.changeLanguage(user.preferredLanguage);
        }
      }
    } catch (e) {
      console.error("Failed to sync language on load", e);
    }
  }, [i18n]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  return (
    <div className="fixed inset-0 w-full overflow-hidden flex flex-col bg-espresso-950 font-sans selection:bg-amber-900 selection:text-amber-100">

      {/* Offline Toast */}
      {isOffline && (
        <div className="absolute top-safe left-1/2 -translate-x-1/2 w-[90%] max-w-sm mt-4 z-[200]">
          <div className="bg-red-500/90 backdrop-blur-md text-espresso-50 px-4 py-3 rounded-2xl shadow-lg border border-red-400/50 flex flex-col items-center justify-center animate-in fade-in slide-in-from-top-4 duration-300">
            <p className="font-bold text-[14px]">{t('app.network_offline')}</p>
            <p className="text-[11px] opacity-80 mt-0.5">{t('app.network_offline_desc')}</p>
          </div>
        </div>
      )}

      {/* Global Popup System Notice Injection */}
      <SystemNoticePopup />

      {/* Global Popup Ad Injection */}
      <GlobalAdBanner placement="ETC_POPUP" />

      <div className={`flex flex-1 min-h-0 w-full relative overflow-hidden ${hideBottomNav ? '' : 'pb-20 md:pb-0'}`}>
        {!hideBottomNav && <div className="hidden md:block w-[72px] shrink-0" />}
        <div className="flex-1 relative h-full min-w-0 flex flex-col">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

const safeGetItem = (storage: Storage, key: string) => {
  try { return storage.getItem(key); } catch { return null; }
};
const safeSetItem = (storage: Storage, key: string, val: string) => {
  try { storage.setItem(key, val); } catch { }
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!safeGetItem(sessionStorage, 'token'));

  // Listen to auth changes to selectively request push
  React.useEffect(() => {
    const handleAuth = () => setIsAuthenticated(!!safeGetItem(sessionStorage, 'token'));
    window.addEventListener('authStateChanged', handleAuth);
    return () => window.removeEventListener('authStateChanged', handleAuth);
  }, []);

  // Initialize push notification hook
  usePushNotifications(isAuthenticated);

  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token') && hash.includes('state=native_google_login')) {
      const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();
      if (!isNative) {
        // We are bouncing from Chrome back into Native App!
        window.location.href = `capcurator://google-login${hash}`;
        return;
      }
    }

    const trackVisitor = async () => {
      // If user is logged in, don't count as anonymous visitor here to keep metrics clean.
      if (safeGetItem(sessionStorage, 'token')) return;

      let visitorId = safeGetItem(localStorage, 'visitor_id');
      if (!visitorId) {
        visitorId = uuidv4();
        safeSetItem(localStorage, 'visitor_id', visitorId);
      }

      try {
        await fetch(`${API_BASE}/api/analytics/visit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId })
        });
      } catch (e) {
        console.error("Failed to track visitor", e);
      }
    };

    trackVisitor();
  }, []);

  return (
    <BrowserRouter>
      <Layout>

        <ErrorBoundary>
          <Suspense fallback={
            <div className="min-h-[100dvh] bg-espresso-950 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4"></div>
              <p className="text-espresso-300 font-mono text-xs tracking-widest animate-pulse">LOADING...</p>
            </div>
          }>
            <Routes>
              <Route path="/" element={<HomeDashboard />} />
              <Route path="/curator" element={<Curator />} />
              <Route path="/community" element={<CoffeeTalk />} />
              <Route path="/clubs" element={<ClubList />} />
              <Route path="/clubs/:id" element={<ClubDetail />} />
              <Route path="/map" element={<ShopBrowser />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/activity" element={<ActivityHistory />} />
              <Route path="/profile/tasting-note" element={<TastingNoteWizard />} />
              <Route path="/profile/tour-wizard" element={<TourRouteWizard />} />
              <Route path="/profile/prescriptions" element={<PrescriptionHistory />} />
              <Route path="/profile/bookmarks" element={<SavedShops />} />
              <Route path="/profile/bookmarked-posts" element={<BookmarkedPosts />} />
              <Route path="/course/:id" element={<CoursePlaylists />} />
              <Route path="/profile/manage-shop" element={<ManageShop />} />
              <Route path="/profile/points" element={<PointHistory />} />
              <Route path="/register" element={<RegisterShop />} />
              <Route path="/profile/host-web" element={<HostWebDashboard />} />


            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </BrowserRouter>
  );
}

// HMR Force Refresh Dummy Comment v2

