import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from "recharts";
import userService from "../services/userService";
import dashboardService from "../services/dashboardService";

/**
 * Overview component that renders a role-specific dashboard.
 */
const Overview = () => {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await userService.me();
        setMe(userRes.data);

        const statsRes = await dashboardService.getStats();
        setDashboardData(statsRes.data);
      } catch (error) {
        console.error("Error fetching overview data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groups = (me?.groups || []).map(g => String(typeof g === 'string' ? g : g.name).toUpperCase());
  const isDoctor = me?.is_superuser || groups.includes("MEDECIN");
  const isSecretary = groups.includes("SECRETAIRE");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 max-w-7xl mx-auto"
    >
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bonjour, {me?.first_name || me?.username || "Utilisateur"}
        </h1>
        <p className="text-gray-500">
          Consultez votre activité et vos informations pour aujourd'hui, {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
        </p>
      </header>

      {isDoctor && <DoctorDashboard data={dashboardData} />}
      {isSecretary && <SecretaryDashboard data={dashboardData} />}
    </motion.div>
  );
};

/* --- SHARED COMPONENTS --- */

const StatCard = ({ title, value, icon, trend, subtext }) => (
  <div className="card hover:shadow-lg transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl bg-primary/10 text-primary`}>
        <i className={`fa-solid ${icon} text-xl`}></i>
      </div>
    </div>
    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
    <div className="flex items-baseline gap-2 mt-1">
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      {subtext && <span className="text-gray-400 text-sm">{subtext}</span>}
    </div>
  </div>
);

/* --- ROLE-SPECIFIC DASHBOARDS --- */

const DoctorDashboard = ({ data }) => {
  if (!data || data.role !== 'doctor') return null;
  const { stats, trends, chartData, todaySchedule } = data;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total des Patients" value={stats.totalPatients} icon="fa-user-group" trend={trends.totalPatients} />
        <StatCard title="Consultations du Jour" value={stats.appointmentsToday} icon="fa-stethoscope" subtext="programmées" trend={trends.appointmentsToday} />
        <StatCard title="Tâches Terminées" value={stats.completedTasks} icon="fa-check-double" trend={trends.completedTasks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="card h-96 flex flex-col">
          <h3 className="text-lg font-semibold mb-6">Tendance de l'Afflux Patients</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: 'var(--primary)', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="patients"
                  stroke="var(--primary)"
                  strokeWidth={4}
                  dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card h-96 flex flex-col">
          <h3 className="text-lg font-semibold mb-6 flex justify-between items-center">
            Planning d'Aujourd'hui
            <span className="badge badge-success">{todaySchedule.length} restants</span>
          </h3>
          <div className="overflow-y-auto pr-2 space-y-4 flex-1">
            {todaySchedule.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">Aucun rendez-vous prévu pour aujourd'hui.</div>
            ) : (
              todaySchedule.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="w-20 text-sm font-semibold text-primary">{item.time}</div>
                  <div className="h-10 w-px bg-gray-200"></div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{item.patient}</div>
                    <div className="text-sm text-gray-500">{item.reason}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                    item.status === 'Waiting' ? 'bg-orange-100 text-orange-700' :
                    item.status === 'Consulting' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {item.status === 'Waiting' ? 'En attente' : 
                     item.status === 'Consulting' ? 'En consultation' : item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SecretaryDashboard = ({ data }) => {
  if (!data || data.role !== 'secretary') return null;
  const { stats, trends, barData, checkInQueue } = data;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Rendez-vous" value={stats.appointmentsToday} icon="fa-calendar-check" trend={trends.appointmentsToday} />
        <StatCard title="Nouvelles Inscriptions" value={stats.newRegistrations} icon="fa-user-plus" trend={trends.newRegistrations} />
        <StatCard title="File d'Attente Totale" value={checkInQueue.length} icon="fa-hourglass-half" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="card h-96 flex flex-col">
          <h3 className="text-lg font-semibold mb-6">Rendez-vous par Médecin</h3>
          <div className="flex-1 flex items-center justify-center text-gray-400">
            {barData.length === 0 ? "Aucune donnée docteur disponible" : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: '#F3F4F6' }}
                  />
                  <Bar dataKey="appts" fill="var(--primary)" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card h-96 flex flex-col">
          <h3 className="text-lg font-semibold mb-6 flex justify-between items-center">
            File d'Attente
            <span className="badge badge-success">{checkInQueue.length} en attente</span>
          </h3>
          <div className="overflow-y-auto space-y-3 flex-1">
            {checkInQueue.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">Aucun patient dans la file d'attente.</div>
            ) : (
              checkInQueue.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.time}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                    item.status === 'Waiting' ? 'bg-orange-100 text-orange-700' :
                    item.status === 'Done' ? 'bg-green-100 text-green-700' : 
                    item.status === 'Consulting' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {item.status === 'Waiting' ? 'En attente' : 
                     item.status === 'Consulting' ? `Avec ${item.doctor || 'le médecin'}` : 
                     item.status === 'Done' ? 'Terminé' : item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



export default Overview;
