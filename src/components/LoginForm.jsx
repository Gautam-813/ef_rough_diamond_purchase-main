import { useState } from "react";
import { api } from "../services/api";
import { useUser } from "../context/UserContext";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const { setUser } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const data = await api.login(email, password);
      if (data.access_token) {
        const userData = await api.getMe();
        setUser(userData);
      } else {
        setErr("Invalid login credentials");
      }
    } catch (err) {
      setErr("Failed to connect to server");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">EF Diamond ERP</h1>
        <p className="auth-sub">Sign in to access your dashboard</p>

        {err && <div style={{ color: "#f87171", fontSize: 12, textAlign: "center", marginBottom: 16 }}>{err}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="auth-input" placeholder="email@diamond.com" required />
          </div>
          <div className="auth-input-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="auth-input" placeholder="••••••••" required />
          </div>

          <button type="submit" className="auth-btn">Sign In</button>
        </form>

        <div style={{ marginTop: 24, fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
          Production Grade Enterprise System · v3.0
        </div>
      </div>
    </div>
  );
}
