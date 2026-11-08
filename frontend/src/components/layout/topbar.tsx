import { Bell, ChevronDown, Menu, Moon, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import { useUiStore } from '../../store/ui-store';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggleTheme } = useUiStore();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button className="lg:hidden" size="icon" variant="ghost" onClick={onMenuClick}><Menu size={19} /></Button>
      </div>
      <div className="flex items-center gap-2">
        <Button aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} size="icon" variant="ghost" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        <Button aria-label="Notifications" size="icon" variant="ghost"><Bell size={18} /></Button>
        <div className="ml-2 flex items-center gap-2 border-l border-border pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">YS</div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold">Workspace admin</p>
            <p className="text-[11px] text-muted-foreground">Administrator</p>
          </div>
          <ChevronDown className="text-muted-foreground" size={15} />
        </div>
      </div>
    </header>
  );
}
