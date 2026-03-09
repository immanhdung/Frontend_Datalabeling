import { useState } from "react";
import api from "../config/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DEV_FALLBACK_USERS = {
  admin1: { id: "dev-admin-1", username: "admin1", role: "admin" },
  manager1: { id: "dev-manager-1", username: "manager1", role: "manager" },
  annotator1: { id: "dev-annotator-1", username: "annotator1", role: "annotator" },
  reviewer1: { id: "dev-reviewer-1", username: "reviewer1", role: "reviewer" },
};

const ENABLE_DEV_FALLBACK = import.meta.env.VITE_ENABLE_DEV_FALLBACK === "true";
const DEV_USERS_KEY = "devAdminUsers";

const findLocalDevUser = (usernameOrEmail) => {
  try {
    const raw = localStorage.getItem(DEV_USERS_KEY);
    const users = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(users)) return null;

    const normalized = String(usernameOrEmail || "").trim().toLowerCase();
    return users.find((user) => {
      const byUsername = String(user?.username || "").toLowerCase() === normalized;
      const byEmail = String(user?.email || "").toLowerCase() === normalized;
      return byUsername || byEmail;
    }) || null;
  } catch (error) {
    return null;
  }
};

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post(
        "/auth/login",
        {
          usernameOrEmail: usernameOrEmail.trim(),
          password: password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Login response data:", res.data);
      const responseData = res.data ?? {};
      const nestedUser = responseData.user ?? {};

      const token =
        responseData.token ??
        responseData.accessToken ??
        responseData.jwt ??
        responseData.jwtToken;

      const resolvedRole =
        responseData.roleName ??
        responseData.role ??
        nestedUser.roleName ??
        nestedUser.role;

      const roleName =
        typeof resolvedRole === "string"
          ? resolvedRole
          : resolvedRole?.name ?? resolvedRole?.roleName;

      const userId = responseData.userId ?? responseData.id ?? nestedUser.id;
      const username =
        responseData.username ??
        responseData.userName ??
        nestedUser.username ??
        usernameOrEmail.trim();

      if (!token || !roleName) {
        throw new Error("Phan hoi dang nhap khong day du token hoac role");
      }

      login(
        {
          id: userId,
          username,
          role: roleName,
        },
        token
      );

      const role = roleName.toLowerCase();
      switch (role) {
        case "admin":
          navigate("/admin/dashboard");
          break;
        case "manager":
          navigate("/manager/dashboard");
          break;
        case "annotator":
          navigate("/annotator/dashboard");
          break;
        case "reviewer":
          navigate("/reviewer/dashboard");
          break;
        default:
          navigate("/login");
      }
    } catch (err) {
      console.error("Login error:", err);

      if (import.meta.env.DEV && ENABLE_DEV_FALLBACK) {
        const localDevUser = findLocalDevUser(usernameOrEmail);
        if (localDevUser) {
          const demoPassword = localDevUser.demoPassword || "123456";
          if (password === demoPassword) {
            const role = String(localDevUser.roleName || localDevUser.role || "annotator").toLowerCase();
            login(
              {
                id: localDevUser.userId || localDevUser.id,
                username: localDevUser.username,
                role,
              },
              "dev-fallback-token"
            );

            switch (role) {
              case "admin":
                navigate("/admin/dashboard");
                return;
              case "manager":
                navigate("/manager/dashboard");
                return;
              case "annotator":
                navigate("/annotator/dashboard");
                return;
              case "reviewer":
                navigate("/reviewer/dashboard");
                return;
              default:
                break;
            }
          }
        }

        const fallbackUser = DEV_FALLBACK_USERS[usernameOrEmail.trim().toLowerCase()];
        if (fallbackUser && password === "123456") {
          login(fallbackUser, "dev-fallback-token");

          switch (fallbackUser.role) {
            case "admin":
              navigate("/admin/dashboard");
              return;
            case "manager":
              navigate("/manager/dashboard");
              return;
            case "annotator":
              navigate("/annotator/dashboard");
              return;
            case "reviewer":
              navigate("/reviewer/dashboard");
              return;
            default:
              break;
          }
        }
      }

      const networkMessage =
        err.code === "ERR_NETWORK"
          ? "Khong the ket noi toi may chu. Hay kiem tra backend/proxy va thu lai."
          : "";

      const serverErrorMessage =
        err.response?.status === 500
          ? "May chu dang loi (500), hien tai khong the dang nhap. Vui long lien he team backend hoac thu lai sau."
          : "";

      const server500Message =
        err.response?.status === 500 && ENABLE_DEV_FALLBACK
          ? "Server dang loi (500). Neu dang test local, thu dang nhap bang manager1/admin1/annotator1/reviewer1 voi mat khau 123456."
          : "";

      setError(
        serverErrorMessage ||
        server500Message ||
        networkMessage ||
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        "Đăng nhập thất bại. Sai username hoặc mật khẩu!"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Data labelling system
        </h1>
        <p className="text-center text-gray-500 mt-2">Đăng nhập để tiếp tục</p>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username / Email
            </label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 
                           text-sm text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg 
                       font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
