// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth } from './routes/RequireAuth';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { NewWorkPage, WorkDetailPage, WorksPage } from './pages/works/WorksPage';
import { FinancePage } from './pages/finance/FinancePage';
import { BudgetsPage } from './pages/budgets/BudgetsPage';
import { ReportsPage } from './pages/reports/ReportsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <MainLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="works" element={<WorksPage />} />
            <Route path="works/new" element={<NewWorkPage />} />
            <Route path="works/:workId" element={<WorkDetailPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
