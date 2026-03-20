import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MENU_BY_ROLE = {
    admin: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Quản lý người dùng", path: "/admin/users" },
        { label: "Quản lý dự án", path: "/admin/projects" },
        { label: "Category & Nhãn", path: "/admin/categories" },
        { label: "Quản lý Datasets", path: "/admin/datasets" },
        { label: "Nhật ký hoạt động", path: "/admin/activity" },
    ],
    manager: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Quản lý dự án", path: "/manager/projects" },
        { label: "Quản lý nhãn", path: "/manager/categories" },
        { label: "Datasets", path: "/manager/datasets" },
        { label: "Giao việc", path: "/manager/assignments" },
        { label: "Kết quả", path: "/manager/results" },
    ],
    annotator: [
        { label: "Dashboard", path: "/annotator/dashboard" },
        { label: "Nhiệm vụ gán nhãn", path: "/annotator/tasks" },
        { label: "Lịch sử dự án", path: "/annotator/history" },
        { label: "Phản hồi", path: "/annotator/feedback" },
    ],
    reviewer: [
        { label: "Dashboard", path: "/reviewer/dashboard" },
        { label: "Kiểm duyệt", path: "/reviewer/review" },
    ],
};

export default function Sidebar() {
    const { user, logout } = useAuth();

    if (!user) return null;

    const menus = MENU_BY_ROLE[user.role?.toLowerCase()] || [];

    return (
        <aside className="w-64 bg-slate-900 text-white flex flex-col">
            {/* Logo */}
            <div className="p-4 text-xl font-bold border-b border-slate-700">
                DataLabel
            </div>

            {/* Menu */}
            <nav className="flex-1 p-4 space-y-2">
                {menus.map((m) => (
                    <NavLink
                        key={m.path}
                        to={m.path}
                        className={({ isActive }) =>
                            `block px-4 py-2 rounded-lg ${isActive
                                ? "bg-indigo-600"
                                : "hover:bg-slate-700"
                            }`
                        }
                    >
                        {m.label}
                    </NavLink>
                ))}
            </nav>

            {/* User info */}
            <div className="p-4 border-t border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                        {(user.email || user.username || "U")[0].toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-medium">{user.email || user.username}</p>
                        <p className="text-xs text-slate-400">{user.role}</p>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="w-full text-sm bg-red-600 py-2 rounded-lg hover:bg-red-700"
                >
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
}
