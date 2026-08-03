import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { ProjectDetailsPage, ProjectMembersPage } from './pages/projects/ProjectDetailsPage';
import { ProjectFormPage } from './pages/projects/ProjectFormPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ForbiddenPage, NotFoundPage } from './pages/system/SystemPages';
import { TaskDetailsPage } from './pages/tasks/TaskDetailsPage';
import { TaskFormPage } from './pages/tasks/TaskFormPage';
import { TaskListPage } from './pages/tasks/TaskListPage';
import { ProtectedRoute, RoleRoute } from './routes/guards';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/forbidden"
        element={
          <ProtectedRoute>
            <ForbiddenPage />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route
          path="projects/new"
          element={
            <RoleRoute roles={['ADMIN']}>
              <ProjectFormPage />
            </RoleRoute>
          }
        />
        <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
        <Route
          path="projects/:projectId/edit"
          element={
            <RoleRoute roles={['ADMIN', 'PROJECT_MANAGER']}>
              <ProjectFormPage />
            </RoleRoute>
          }
        />
        <Route
          path="projects/:projectId/members"
          element={
            <RoleRoute roles={['ADMIN', 'PROJECT_MANAGER']}>
              <ProjectMembersPage />
            </RoleRoute>
          }
        />
        <Route path="projects/:projectId/tasks" element={<TaskListPage />} />
        <Route
          path="projects/:projectId/tasks/new"
          element={
            <RoleRoute roles={['ADMIN', 'PROJECT_MANAGER']}>
              <TaskFormPage />
            </RoleRoute>
          }
        />
        <Route path="tasks/my" element={<TaskListPage mode="mine" />} />
        <Route path="tasks/:taskId" element={<TaskDetailsPage />} />
        <Route
          path="tasks/:taskId/edit"
          element={
            <RoleRoute roles={['ADMIN', 'PROJECT_MANAGER']}>
              <TaskFormPage />
            </RoleRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <RoleRoute roles={['ADMIN']}>
              <UsersPage />
            </RoleRoute>
          }
        />
        <Route
          path="admin/audit"
          element={
            <RoleRoute roles={['ADMIN']}>
              <AuditLogsPage />
            </RoleRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
