// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth } from './routes/RequireAuth';
import { RoleLayout } from './routes/RoleLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { NewWorkPage, WorkDetailPage, WorksPage } from './pages/works/WorksPage';
import { FinancePage } from './pages/finance/FinancePage';
import { BudgetsPage } from './pages/budgets/BudgetsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { EmployeeEnrollmentPage } from './pages/auth/EmployeeEnrollmentPage';
import { DocumentComposer } from './pages/documents/DocumentComposer';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/employee-enrollment/:code" element={<RequireAuth><EmployeeEnrollmentPage /></RequireAuth>} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <RoleLayout />
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
            <Route path="budgets/document" element={<DocumentComposer key="budget" kind="budget" />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/document" element={<DocumentComposer key="report" kind="report" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
