import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "./pages/Admin/Dashboard";
import ManagerDashboard from "./pages/Manager/Dashboard";
import Login from "./pages/Login";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
