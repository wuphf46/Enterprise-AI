import { Bell, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import { useUiStore } from '../../store/ui-store';
import { useAuthStore } from '../../store/auth-store';
import { api } from '../../lib/api';

type TopbarProps = {
  onMenuClick: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function Topbar({ onMenuClick, collapsed, onToggleCollapsed }: TopbarProps) {
  const { theme, toggleTheme } = useUiStore();
  const { user, clearSession } = useAuthStore();

  async function signOut() {
    try { await api.post('/api/auth/logout'); } finally { clearSession(); }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button className="lg:hidden" size="icon" variant="ghost" onClick={onMenuClick}><Menu size={19} /></Button>
        <Button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden text-muted-foreground lg:inline-flex -ml-8"
          size="icon"
          variant="ghost"
          onClick={onToggleCollapsed}
        >
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} size="icon" variant="ghost" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        <Button aria-label="Notifications" size="icon" variant="ghost"><Bell size={18} /></Button>
        <Button aria-label="Sign out" size="icon" variant="ghost" onClick={signOut}><LogOut size={18} /></Button>
        <div className="ml-2 flex items-center gap-2 border-l border-border pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{user?.username.slice(0, 2).toUpperCase()}</div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold">{user?.username}</p>
            <p className="text-[11px] capitalize text-muted-foreground">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
