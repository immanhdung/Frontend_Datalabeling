import { useState } from "react";
import api from "../config/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
        "/Auth/login",
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
      const {
        userId,
        username,
        roleName,
        token,
      } = res.data;

      if (!token || !roleName) {
        throw new Error("Invalid response from server");
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
      setError(
        err.response?.data?.message ||
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
