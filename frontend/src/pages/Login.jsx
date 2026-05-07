import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import userService from "../services/userService";
import { applyTheme, themeFromMe } from "../utils/theme";

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8000/api/token/", {
        username: username.trim(),
        password,
      });

      localStorage.setItem("access_token", response.data.access);
      localStorage.setItem("refresh_token", response.data.refresh);

      // ✅ récupère l'utilisateur (superuser + groups)
      const meRes = await userService.me();
      const me = meRes.data;

      const groups = (me.groups || []).map((g) => (typeof g === "string" ? g : g.name)).map((s) => s.toUpperCase());
      const isSuper = !!me.is_superuser;

      const theme = themeFromMe(me);
      applyTheme(theme);

      toast.success("Connexion réussie !");

      // ✅ routes selon rôle
      if (isSuper) {
        navigate("/admin/dashboard", { replace: true });
      } else if (groups.includes("MEDECIN") || groups.includes("SECRETAIRE")) {
        navigate("/overview", { replace: true });
      } else if (groups.includes("PATIENT")) {
        navigate("/patient/infos", { replace: true });
      } else {
        navigate("/", { replace: true }); // fallback
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) toast.error("Identifiants incorrects");
      else toast.error("Erreur serveur / API indisponible");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="card animate-fade-in" style={{
        width: '100%', maxWidth: '440px', padding: '3rem 2.5rem', textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ 
            backgroundColor: 'var(--primary)', width: 44, height: 44, borderRadius: '12px', 
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
          }}>
            <i className="fa-solid fa-heart-pulse" style={{ fontSize: '24px' }}></i>
          </div>
          <h1 style={{ 
            color: 'var(--primary)', fontWeight: 700, fontSize: '2.25rem', 
            letterSpacing: '-0.025em', margin: 0 
          }}>
            MedPredict
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              disabled={loading}
              style={{ width: '100%' }}
              placeholder="ex: docteur_lemaire"
            />
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
              style={{ width: '100%' }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem', fontWeight: 600 }}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}