import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";

import AdminDashboard from "./pages/Admin/Dashboard";
import ManagerDashboard from "./pages/Manager/Dashboard";
import Login from "./pages/Login";
import ManagerProjects from "./pages/Manager/Projects";
import ManagerCategories from "./pages/Manager/Categories.jsx";
import ManagerAssignments from "./pages/Manager/Assignments";
import ManagerReview from "./pages/Manager/Review";

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<DashboardLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/manager/dashboard" element={<ManagerDashboard />} />
                <Route path="/manager/projects" element={<ManagerProjects />} />
                <Route path="/manager/categories" element={<ManagerCategories />} />
                <Route path="/manager/assignments" element={<ManagerAssignments />} />
                <Route path="/manager/review" element={<ManagerReview />} />
            </Route>

            <Route path="/" element={<Navigate to="/admin/dashboard" />} />
            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
}

export default App;
