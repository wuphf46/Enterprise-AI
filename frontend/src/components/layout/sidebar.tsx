import { FileText, LayoutDashboard, MessageSquare, ShieldCheck, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

const navigation = [
  { label: 'Chat', path: '/chat', icon: MessageSquare },
  { label: 'Documents', path: '/documents', icon: FileText },
  { label: 'Admin dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Approvals', path: '/approvals', icon: ShieldCheck },
];

type SidebarProps = {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
};

export function Sidebar({ open, collapsed, onClose }: SidebarProps) {
  return (
    <>
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:translate-x-0',
          collapsed && 'lg:w-[88px]',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <NavLink className="flex items-center gap-3" to="/chat" onClick={onClose}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">EA</span>
            <span className={cn('text-sm font-semibold tracking-tight', collapsed && 'lg:hidden')}>Enterprise AI</span>
          </NavLink>
          <Button className="lg:hidden" size="icon" variant="ghost" onClick={onClose}><X size={18} /></Button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className={cn('mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground', collapsed && 'lg:hidden')}>Workspace</p>
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
              to={path}
              onClick={onClose}
            >
              <Icon size={18} />
              <span className={cn(collapsed && 'lg:hidden')}>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={cn('m-3 rounded-xl bg-muted p-3', collapsed && 'lg:hidden')}>
          <p className="text-xs font-semibold">Enterprise workspace</p>
          <p className="mt-1 text-xs text-muted-foreground">Securely manage your knowledge.</p>
        </div>
      </aside>
    </>
  );
}
