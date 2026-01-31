import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";

import AdminDashboard from "./pages/Admin/Dashboard";
import ManagerDashboard from "./pages/Manager/Dashboard";
import AnnotatorDashboard from "./pages/Annotator/Dashboard";
import ReviewerDashboard from "./pages/Reviewer/Dashboard";
import Login from "./pages/Login";

export default function App() {
    return (
        <Routes>
            <Route element={<DashboardLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/manager/dashboard" element={<ManagerDashboard />} />
                <Route path="/annotator/dashboard" element={<AnnotatorDashboard />} />
                <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/admin/dashboard" />} />
        </Routes>
    );
}
