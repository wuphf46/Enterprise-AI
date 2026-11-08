import { useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Button } from '../ui/button';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar open={sidebarOpen} collapsed={collapsed} onClose={() => setSidebarOpen(false)} />
      <div className={collapsed ? 'lg:pl-[88px]' : 'lg:pl-64'}>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="hidden h-0 lg:block">
          <Button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="fixed left-4 top-[76px] z-30 text-muted-foreground"
            size="icon"
            variant="ghost"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>
        </div>
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <Button
        aria-label="Open navigation"
        className="fixed bottom-5 right-5 z-20 shadow-lg lg:hidden"
        size="icon"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu size={18} />
      </Button>
    </div>
  );
}
