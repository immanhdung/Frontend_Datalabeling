import { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import {
    LayoutDashboard,
    FolderKanban,
    Users,
    ClipboardCheck,
    Settings,
    LogOut,
    Menu,
    X,
    Tag,
    FileCheck,
    Activity,
    ChevronRight,
    FolderOpen,
    History,
    MessageSquare,
    Database,
} from "lucide-react";

const roleNavItems = {
    admin: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
        { icon: Users, label: "Quản lý người dùng", path: "/admin/users" },
        { icon: FolderKanban, label: "Quản lý dự án", path: "/admin/projects" },
        { icon: FolderOpen, label: "Category & Nhãn", path: "/admin/categories" },
        { icon: Database, label: "Datasets", path: "/admin/datasets" },
        { icon: Activity, label: "Nhật ký hoạt động", path: "/admin/activity" },
    ],
    manager: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/manager/dashboard" },
        { icon: FolderKanban, label: "Quản lý dự án", path: "/manager/projects" },
        { icon: FolderOpen, label: "Quản lý nhãn", path: "/manager/categories" },
        { icon: Database, label: "Datasets", path: "/manager/datasets" },
        { icon: Users, label: "Giao việc", path: "/manager/assignments" },
        { icon: FileCheck, label: "Kết quả", path: "/manager/results" },
    ],
    annotator: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/annotator/dashboard" },
        { icon: Tag, label: "Nhiệm vụ gán nhãn", path: "/annotator/tasks" },
        { icon: History, label: "Lịch sử dự án", path: "/annotator/history" },
        { icon: MessageSquare, label: "Phản hồi", path: "/annotator/feedback" },
    ],
    reviewer: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/reviewer/dashboard" },
        { icon: FileCheck, label: "Kiểm duyệt", path: "/reviewer/review" },
        { icon: History, label: "Lịch sử review", path: "/reviewer/history" },
        { icon: Activity, label: "Thống kê", path: "/reviewer/analytics" },
    ],
};

export default function DashboardLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const role = location.pathname.split("/")[1]?.toLowerCase();
    const navItems = roleNavItems[role] || [];

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"
                    }`}
            >
                <div className="flex h-16 items-center justify-between px-4 border-b">
                    {sidebarOpen && (
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                                <Tag className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-3xl">DataLabel</span>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded hover:bg-gray-100"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-lg font-medium transition ${isActive
                                    ? "bg-indigo-600 text-white"
                                    : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                                    }`}
                            >
                                <Icon className="h-5 w-5 shrink-0" />
                                {sidebarOpen && (
                                    <>
                                        <span className="flex-1">{item.label}</span>
                                        {isActive && <ChevronRight className="h-4 w-4" />}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t p-4">
                    <div
                        className={`flex items-center gap-3 ${sidebarOpen ? "" : "justify-center"
                            }`}
                    >
                        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                            {(user?.username || user?.email || "U")[0].toUpperCase()}
                        </div>

                        {sidebarOpen && (
                            <div className="flex-1">
                                <p className="font-medium truncate">{user?.username || user?.email || "User"}</p>
                                <p className="text-xs text-gray-500 capitalize">{user?.role || role}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="mt-3 w-full flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded"
                    >
                        <LogOut className="h-4 w-4" />
                        {sidebarOpen && "Đăng xuất"}
                    </button>
                </div>
            </aside>
            <main
                className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"
                    }`}
            >
                <div className="p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
