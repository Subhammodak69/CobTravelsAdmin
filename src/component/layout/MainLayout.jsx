import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { ThemeProvider } from '../../context/ThemeContext';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('sidebarCollapsed');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const sidebarRef = useRef(null);
  const mainRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [pathname]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const sidebarOffset = isMobile ? '0px' : (desktopSidebarCollapsed ? '64px' : '256px');
    document.documentElement.style.setProperty('--sidebar-offset', sidebarOffset);
    window.dispatchEvent(new Event('sidebar-offset-change'));
  }, [isMobile, desktopSidebarCollapsed]);

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      const nextCollapsed = !desktopSidebarCollapsed;
      setDesktopSidebarCollapsed(nextCollapsed);
      setSidebarHovered(false);
      try { localStorage.setItem('sidebarCollapsed', String(nextCollapsed)); } catch {}
    }
  };

  const handleOverlayClick = () => {
    if (isMobile) setSidebarOpen(false);
  };

  const handleSidebarHover = (hovered) => {
    if (!isMobile) setSidebarHovered(hovered);
  };

  const isSidebarExpanded = () => {
    if (isMobile) return false;
    if (sidebarHovered) return true;
    return !desktopSidebarCollapsed;
  };

  const getContentMargin = () => {
    if (isMobile) return 'ml-0';
    return desktopSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 transition-colors duration-300 overflow-hidden">
        <Navbar
          toggleSidebar={toggleSidebar}
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          isDesktopSidebarExpanded={!desktopSidebarCollapsed}
        />

        <div className="flex flex-1 relative overflow-hidden">
          <div ref={sidebarRef} className="z-30">
            <Sidebar
              isMobile={isMobile}
              sidebarOpen={sidebarOpen}
              toggleSidebar={toggleSidebar}
              onHover={handleSidebarHover}
              isExpanded={isSidebarExpanded()}
            />
          </div>

          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-20 transition-opacity duration-300"
              onClick={handleOverlayClick}
              style={{ top: '64px' }}
            />
          )}

          <main
            ref={mainRef}
            className={`
              flex-1 transition-all duration-300 ease-out
              ${getContentMargin()}
              overflow-y-auto overflow-x-hidden
            `}
            style={{
              transition: 'margin-left 0.3s ease-out',
              maxWidth: isMobile ? '100%' : `calc(100vw - ${desktopSidebarCollapsed ? '64px' : '256px'})`,
            }}
          >
            <div className="w-full max-w-8xl px-2 py-2">
              {children || <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default MainLayout;
