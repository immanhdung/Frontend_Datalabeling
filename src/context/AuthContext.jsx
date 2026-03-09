import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const ENABLE_DEV_LOGIN_BYPASS = import.meta.env.VITE_BYPASS_LOGIN === "true";
const DEV_BYPASS_USER = {
    id: "dev-admin-1",
    username: "admin1",
    role: "admin",
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        const savedToken = localStorage.getItem("accessToken");

        if (savedUser && savedToken) {
            setUser(JSON.parse(savedUser));
            setToken(savedToken);
            setLoading(false);
            return;
        }

        if (import.meta.env.DEV && ENABLE_DEV_LOGIN_BYPASS) {
            setUser(DEV_BYPASS_USER);
            setToken("dev-bypass-token");
            localStorage.setItem("user", JSON.stringify(DEV_BYPASS_USER));
            localStorage.setItem("accessToken", "dev-bypass-token");
        }

        setLoading(false);
    }, []);

    const login = (userData, accessToken) => {
        setUser(userData);
        setToken(accessToken);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("accessToken", accessToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return context;
}
