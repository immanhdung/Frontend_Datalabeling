import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../config/api";
import { useAuth } from "../contexts/AuthContext";

function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await api.post("/Auth/login", {
        usernameOrEmail,
        password,
      });

      const { accessToken, user } = res.data;

      // lưu vào AuthContext + localStorage
      login(user, accessToken);

      // 👉 redirect theo role
      switch (user.role) {
        case "Admin":
          navigate("/admin/dashboard");
          break;
        case "Manager":
          navigate("/manager/dashboard");
          break;
        case "Annotator":
          navigate("/annotator/dashboard");
          break;
        case "Reviewer":
          navigate("/reviewer/dashboard");
          break;
        default:
          navigate("/login");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Sai tài khoản hoặc mật khẩu");
    }
  };

  return (
    <div>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
          placeholder="Username or Email"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default Login;
