import React, { useState, useEffect } from "react";
import adminService from "../../services/adminService";
import userService from "../../services/userService";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "MEDECIN"
  });

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, actRes, healthRes, meRes] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers(),
        adminService.getRecentActivity(),
        adminService.getSystemHealth(),
        userService.me()
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setActivity(actRes.data);
      setHealth(healthRes.data);
      setMe(meRes.data);
    } catch (err) {
      console.error("Error fetching admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminService.createUser(newUser);
      setShowModal(false);
      setNewUser({ username: "", password: "", email: "", first_name: "", last_name: "", role: "MEDECIN" });
      fetchData(); // Refresh list and stats
    } catch (err) {
      console.error("Error creating user", err);
      alert(err.response?.data?.error || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await adminService.updateUserStatus(userId, !currentStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );
    } catch (err) {
      console.error("Error updating user status", err);
    }
  };

  const getRoleBadge = (roles) => {
    if (roles.includes("ADMIN")) return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Admin</span>;
    if (roles.includes("MEDECIN")) return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Médecin</span>;
    if (roles.includes("SECRETAIRE")) return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Secrétaire</span>;
    if (roles.includes("PATIENT")) return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Patient</span>;
    return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">Utilisateur</span>;
  };

  const filteredUsers = users.filter((user) => {
    if (roleFilter === "ALL") return true;
    if (roleFilter === "AUCUN" && user.roles.length === 0) return true;
    return user.roles.includes(roleFilter);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  // Data for Recharts Pie Chart
  const pieData = stats ? [
    { name: "Médecins", value: stats.roles_distribution.medecins, color: "#3B82F6" },
    { name: "Secrétaires", value: stats.roles_distribution.secretaires, color: "#10B981" },
    { name: "Patients", value: stats.roles_distribution.patients, color: "#F59E0B" },
    { name: "Admins", value: stats.roles_distribution.admins, color: "#EF4444" },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* 🌟 Header with Mesh Gradient Style */}
      <div className="relative rounded-3xl p-8 overflow-hidden text-white shadow-lg" 
           style={{ background: "linear-gradient(135deg, var(--primary) 0%, #2563EB 100%)" }}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-10 w-40 h-40 bg-blue-300 opacity-20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold mb-2">Administration Système</h1>
            <p className="opacity-90 font-medium">Vue d'ensemble et contrôle en temps réel de MedPredict.</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-white/20 hover:bg-white/30 border border-white/30 text-white shadow-none transition-all">
              <i className="fa-solid fa-download"></i> Exporter
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-white text-[var(--primary)] hover:bg-gray-50 shadow-lg"
            >
              <i className="fa-solid fa-plus"></i> Nouvel Utilisateur
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 📊 KPI & Chart Section (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card border-l-4 border-blue-500 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-500 text-xs tracking-wider uppercase">Total Médecins</h3>
                <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><i className="fa-solid fa-user-doctor fa-lg"></i></div>
              </div>
              <p className="text-3xl font-extrabold text-gray-800">{stats?.roles_distribution.medecins}</p>
            </div>
            <div className="card border-l-4 border-yellow-500 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-500 text-xs tracking-wider uppercase">Total Patients</h3>
                <div className="p-2 bg-yellow-50 text-yellow-500 rounded-xl"><i className="fa-solid fa-hospital-user fa-lg"></i></div>
              </div>
              <p className="text-3xl font-extrabold text-gray-800">{stats?.roles_distribution.patients}</p>
            </div>
            <div className="card border-l-4 border-[var(--primary)] hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-500 text-xs tracking-wider uppercase">Consultations</h3>
                <div className="p-2 bg-[var(--primary-light)] text-[var(--primary)] rounded-xl"><i className="fa-solid fa-stethoscope fa-lg"></i></div>
              </div>
              <p className="text-3xl font-extrabold text-gray-800">{stats?.total_consultations}</p>
            </div>
            <div className="card border-l-4 border-green-500 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-500 text-xs tracking-wider uppercase">Secrétaires</h3>
                <div className="p-2 bg-green-50 text-green-500 rounded-xl"><i className="fa-solid fa-user-nurse fa-lg"></i></div>
              </div>
              <p className="text-3xl font-extrabold text-gray-800">{stats?.roles_distribution.secretaires}</p>
            </div>
          </div>
          
          <div className="card flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 w-full">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Répartition des Utilisateurs</h3>
              <p className="text-sm text-gray-500 mb-4">Aperçu visuel des accès à la plateforme.</p>
              <div className="space-y-3">
                {pieData.map(item => (
                  <div key={item.name} className="flex justify-between items-center text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      {item.name}
                    </div>
                    <span className="text-gray-600">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-48 w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ⚡ Health & Timeline Section (1/3 width) */}
        <div className="space-y-6">
          {/* System Health */}
          <div className="card bg-gray-900 text-white border-0">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <i className="fa-solid fa-server text-blue-400"></i> État du Système
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="text-sm text-gray-400">Moteur IA (Prédictions)</span>
                {health?.ai_service === "Online" ? (
                  <span className="flex items-center text-green-400 text-sm font-bold"><i className="fa-solid fa-circle text-[8px] mr-2 animate-pulse"></i> Online</span>
                ) : (
                  <span className="flex items-center text-red-400 text-sm font-bold"><i className="fa-solid fa-triangle-exclamation mr-1"></i> Offline</span>
                )}
              </div>
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="text-sm text-gray-400">Latence IA</span>
                <span className="text-sm font-mono">{health?.ai_latency_ms || 0} ms</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="text-sm text-gray-400">Base de données</span>
                <span className="flex items-center text-green-400 text-sm font-bold"><i className="fa-solid fa-circle text-[8px] mr-2"></i> Stable</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Prédictions du jour</span>
                <span className="text-lg font-bold text-blue-400">{health?.predictions_today || 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-bolt text-yellow-500"></i> Activité Récente
            </h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
              {activity.map((act, i) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-gray-100 text-gray-500 shrink-0 z-10 shadow">
                    {act.type === "NEW_USER" ? <i className="fa-solid fa-user-plus text-[10px]"></i> : <i className="fa-solid fa-file-medical text-[10px]"></i>}
                  </div>
                  <div className="w-[calc(100%-2.5rem)] ml-3">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      {act.type === "NEW_USER" ? (
                        <p className="text-sm text-gray-600">Nouvel utilisateur <span className="font-bold text-gray-800">@{act.username}</span> a rejoint.</p>
                      ) : (
                        <p className="text-sm text-gray-600">Consultation <span className="font-bold text-[var(--primary)]">Dr. {act.medecin}</span> ➔ {act.patient}</p>
                      )}
                      <time className="block text-[10px] text-gray-400 mt-1">{new Date(act.date).toLocaleString()}</time>
                    </div>
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p className="text-sm text-gray-500 text-center">Aucune activité récente.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-white gap-4">
          <h2 className="text-xl font-bold text-gray-800">Annuaire des Utilisateurs</h2>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
            <div className="flex items-center px-2">
              <i className="fa-solid fa-filter text-gray-400 mr-2 text-sm"></i>
              <select 
                className="bg-transparent text-sm font-semibold text-gray-700 cursor-pointer m-0 p-2"
                style={{ border: "none", outline: "none", boxShadow: "none" }}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="ALL">Tous les rôles</option>
                <option value="ADMIN">Administrateurs</option>
                <option value="MEDECIN">Médecins</option>
                <option value="SECRETAIRE">Secrétaires</option>
                <option value="PATIENT">Patients</option>
                <option value="AUCUN">Sans rôle</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date d'inscription</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-3 font-bold shadow-inner">
                        {user.first_name ? user.first_name[0].toUpperCase() : user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.roles)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      disabled={me?.id === user.id}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ml-auto ${
                        me?.id === user.id
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                        : user.is_active 
                          ? "bg-white border border-red-200 text-red-600 hover:bg-red-50" 
                          : "bg-green-500 text-white hover:bg-green-600 border border-green-500"
                      }`}
                      title={me?.id === user.id ? "Vous ne pouvez pas vous désactiver vous-même" : ""}
                    >
                      {user.is_active ? <><i className="fa-solid fa-lock"></i> Suspendre</> : <><i className="fa-solid fa-lock-open"></i> Activer</>}
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <i className="fa-regular fa-folder-open text-4xl mb-3 opacity-30"></i>
                    <p>Aucun utilisateur trouvé pour ce filtre.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🏙️ Modal Création Utilisateur */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Créer un utilisateur</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <i className="fa-solid fa-xmark fa-lg"></i>
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prénom</label>
                  <input 
                    type="text" 
                    className="w-full" 
                    placeholder="Jean" 
                    value={newUser.first_name}
                    onChange={e => setNewUser({...newUser, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nom</label>
                  <input 
                    type="text" 
                    className="w-full" 
                    placeholder="Dupont" 
                    value={newUser.last_name}
                    onChange={e => setNewUser({...newUser, last_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nom d'utilisateur *</label>
                <input 
                  type="text" 
                  className="w-full" 
                  placeholder="j.dupont" 
                  required
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                <input 
                  type="email" 
                  className="w-full" 
                  placeholder="jean@exemple.com" 
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mot de passe *</label>
                <input 
                  type="password" 
                  className="w-full" 
                  placeholder="••••••••" 
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rôle *</label>
                <select 
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="MEDECIN">Médecin</option>
                  <option value="SECRETAIRE">Secrétaire</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-[var(--primary)] text-white hover:bg-blue-600 shadow-lg shadow-blue-200"
                >
                  {creating ? "Création..." : "Confirmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
