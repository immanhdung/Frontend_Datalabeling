import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ⚠️ IMPORT ĐÚNG TÊN FILE
import AdminDashboard from "./pages/Admin/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang mặc định */}
        <Route path="/" element={<Navigate to="/admin/dashboard" />} />

        {/* Admin */}
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        {/* Test route khác */}
        <Route
          path="/test"
          element={<h1 className="text-2xl p-6">Test page</h1>}
        />

        {/* 404 */}
        <Route
          path="*"
          element={<h1 className="text-2xl p-6">404 Not Found</h1>}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
