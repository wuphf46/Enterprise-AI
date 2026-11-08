import { LayoutDashboard } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/app-layout';
import { PlaceholderPage } from '../pages/placeholder-page';
import { ApprovalsPage } from '../pages/approvals-page';
import { ChatPage } from '../pages/chat-page';
import { DocumentsPage } from '../pages/documents-page';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate replace to="/chat" />} />
        <Route element={<ChatPage />} path="/chat" />
        <Route element={<DocumentsPage />} path="/documents" />
        <Route element={<PlaceholderPage eyebrow="Operations" title="Admin dashboard" description="Monitor workspace activity, usage, and system health from one operational view." icon={LayoutDashboard} />} path="/admin" />
        <Route element={<ApprovalsPage />} path="/approvals" />
      </Route>
      <Route path="*" element={<Navigate replace to="/chat" />} />
    </Routes>
  );
}
