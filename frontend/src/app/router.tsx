import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/app-layout';
import { AdminPage } from '../pages/admin-page';
import { ApprovalsPage } from '../pages/approvals-page';
import { ChatPage } from '../pages/chat-page';
import { DocumentsPage } from '../pages/documents-page';
import { LoginPage } from '../pages/login-page';
import { RegisterPage } from '../pages/register-page';
import { ProtectedRoute } from '../auth/protected-route';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<RegisterPage />} path="/register" />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
        <Route index element={<Navigate replace to="/chat" />} />
        <Route element={<ChatPage />} path="/chat" />
        <Route element={<DocumentsPage />} path="/documents" />
          <Route element={<ProtectedRoute adminOnly />}>
            <Route element={<AdminPage />} path="/admin" />
            <Route element={<ApprovalsPage />} path="/approvals" />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate replace to="/chat" />} />
    </Routes>
  );
}
