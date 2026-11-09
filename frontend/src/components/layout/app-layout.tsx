import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Button } from '../ui/button';
import { useUiStore } from '../../store/ui-store';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const theme = useUiStore((state) => state.theme);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const closeSidebar = useUiStore((state) => state.closeSidebar);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar open={sidebarOpen} collapsed={collapsed} onClose={closeSidebar} />
      <div className={collapsed ? 'lg:pl-[88px]' : 'lg:pl-64'}>
        <Topbar collapsed={collapsed} onMenuClick={toggleSidebar} onToggleCollapsed={() => setCollapsed((value) => !value)} />
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <Button
        aria-label="Open navigation"
        className="fixed bottom-5 right-5 z-20 lg:hidden"
        size="icon"
        onClick={toggleSidebar}
      >
        <Menu size={18} />
      </Button>
    </div>
  );
}
