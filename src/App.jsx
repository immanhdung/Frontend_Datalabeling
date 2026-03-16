import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";

import Login from "./pages/Login";

// Admin
import AdminDashboard from "./pages/Admin/Dashboard";
import Users from "./pages/Admin/Users";
import SystemSettings from "./pages/Admin/SystemSettings";
import ActivityLogs from "./pages/Admin/ActivityLogs";

// Manager
import ManagerDashboard from "./pages/Manager/Dashboard";
import ManagerProjects from "./pages/Manager/Projects";
import Categories from "./pages/Manager/Categories";
import ManagerAssignments from "./pages/Manager/AssignTasks";
import ManagerReview from "./pages/Manager/Review";
import ManagerProjectsDetail from "./pages/Manager/ProjectDetail";
import CreateProjectPage from "./pages/Manager/CreateProject";
import Datasets from "./pages/Manager/Datasets";


// Annotator
import AnnotatorDashboard from "./pages/Annotator/Dashboard";
import AnnotatorTask from "./pages/Annotator/Task";
import AnnotatorHistory from "./pages/Annotator/History";
import AnnotatorFeedback from "./pages/Annotator/Feedback";

// Reviewer
import ReviewerDashboard from "./pages/Reviewer/Dashboard";
import ReviewerHistory from "./pages/Reviewer/History";
import ReviewerAnalytics from "./pages/Reviewer/Analytics";
import ReviewerTask from "./pages/Reviewer/Task";
import ReviewInbox from "./pages/Reviewer/ReviewInbox";


function ProtectedRoute({ children, allowRoles }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (allowRoles && !allowRoles.includes(user.role.toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role.toLowerCase()) {
    case "admin":
      return <Navigate to="/admin/dashboard" replace />;
    case "manager":
      return <Navigate to="/manager/dashboard" replace />;
    case "annotator":
      return <Navigate to="/annotator/dashboard" replace />;
    case "reviewer":
      return <Navigate to="/reviewer/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleRedirect />} />
      <Route element={<DashboardLayout />}>
        {/* ADMIN */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <SystemSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />

        {/* MANAGER */}
        <Route
          path="/manager"
          element={<Navigate to="/manager/dashboard" replace />}
        />
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute allowRoles={["manager"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/projects"
          element={
            <ProtectedRoute allowRoles={["manager"]}>
              <ManagerProjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/projects/create"
          element={
            <ProtectedRoute allowRoles={["manager"]}>
              <CreateProjectPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/projects/:id"
          element={
            <ProtectedRoute allowRoles={["manager"]}>
              <ManagerProjectsDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/categories"
          element={
            <ProtectedRoute allowRoles={["manager"]}>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/assignments"
          element={
            <ProtectedRoute allowRoles={["manager"]}>
              <ManagerAssignments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/review"
          element={
            <ProtectedRoute allowRoles={["manager"]}>
              <ManagerReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/datasets"
          element={
            <ProtectedRoute allowRoles={["manager"]}>
              <Datasets />
            </ProtectedRoute>
          }
        />


        {/* ANNOTATOR */}
        <Route
          path="/annotator/dashboard"
          element={
            <ProtectedRoute allowRoles={["annotator"]}>
              <AnnotatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/annotator/tasks/:taskId"
          element={
            <ProtectedRoute allowRoles={["annotator"]}>
              <AnnotatorTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/annotator/tasks"
          element={
            <ProtectedRoute allowRoles={["annotator"]}>
              <AnnotatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/annotator/history"
          element={
            <ProtectedRoute allowRoles={["annotator"]}>
              <AnnotatorHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/annotator/feedback"
          element={
            <ProtectedRoute allowRoles={["annotator"]}>
              <AnnotatorFeedback />
            </ProtectedRoute>
          }
        />

        {/* REVIEWER */}
        <Route
          path="/reviewer/dashboard"
          element={
            <ProtectedRoute allowRoles={["reviewer"]}>
              <ReviewerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/review"
          element={
            <ProtectedRoute allowRoles={["reviewer"]}>
              <ReviewInbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/task/:taskId"
          element={
            <ProtectedRoute allowRoles={["reviewer"]}>
              <ReviewerTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/history"
          element={
            <ProtectedRoute allowRoles={["reviewer"]}>
              <ReviewerHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/analytics"
          element={
            <ProtectedRoute allowRoles={["reviewer"]}>
              <ReviewerAnalytics />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
