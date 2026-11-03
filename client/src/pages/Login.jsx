import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import Brand from "../components/Brand.jsx";

// One component for both /login and /register
export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [noAccount, setNoAccount] = useState(false); // the email is not registered
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNoAccount(false);
    const email = f.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address");
    if (!f.password) return setError("Enter your password");
    if (isRegister && !f.name.trim()) return setError("Enter your name");
    setBusy(true);
    try {
      if (isRegister) await register(f.name.trim(), email, f.password);
      else await login(email, f.password);
      navigate("/");
    } catch (err) {
      setNoAccount(err.response?.data?.code === "NO_ACCOUNT");
      setError(err.response?.data?.message || "Could not reach the server. Is the backend running?");
      setBusy(false);
    }
  };

  return (
    <div className="authwrap">
    <div className="auth">
      <p className="brand"><Brand /></p>
      <h1>{isRegister ? "Create account" : "Log in"}</h1>
      <form onSubmit={submit}>
        {isRegister && <input placeholder="Name" value={f.name} onChange={set("name")} />}
        <input type="email" placeholder="Email" autoComplete="email" value={f.email} onChange={set("email")} />
        <input type="password" placeholder="Password (min 6 characters)" value={f.password} onChange={set("password")} />
        <button type="submit" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Sign up" : "Log in"}</button>
        {error && <span className="err">{error}</span>}
        {noAccount && <Link to="/register">Create an account with this email</Link>}
      </form>
      <p className="dim">
        {isRegister ? <>Already have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/register">Create an account</Link></>}
      </p>
    </div>
    </div>
  );
}
