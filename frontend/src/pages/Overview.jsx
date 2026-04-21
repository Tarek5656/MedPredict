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
  const isPatient = groups.includes("PATIENT");

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 max-w-7xl mx-auto"
    >
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {me?.first_name || me?.username || "User"}
        </h1>
        <p className="text-gray-500">
          Check your activity and information for today, {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
        </p>
      </header>

      {isDoctor && <DoctorDashboard data={dashboardData} />}
      {isSecretary && <SecretaryDashboard data={dashboardData} />}
      {isPatient && <PatientDashboard me={me} data={dashboardData} />}
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
      {trend && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
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
        <StatCard title="Total Patients" value={stats.totalPatients} icon="fa-user-group" trend={trends.totalPatients} />
        <StatCard title="Today's Consultations" value={stats.appointmentsToday} icon="fa-stethoscope" subtext="scheduled" trend={trends.appointmentsToday} />
        <StatCard title="Completed Tasks" value={stats.completedTasks} icon="fa-check-double" trend={trends.completedTasks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="card h-96 flex flex-col">
          <h3 className="text-lg font-semibold mb-6">Patient Influx Trend</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
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
          <h3 className="text-lg font-semibold mb-6">Today's Schedule</h3>
          <div className="overflow-y-auto pr-2 space-y-4 flex-1">
            {todaySchedule.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">No appointments scheduled for today.</div>
            ) : (
              todaySchedule.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className="w-20 text-sm font-semibold text-primary">{item.time}</div>
                  <div className="h-10 w-px bg-gray-200"></div>
                  <div>
                    <div className="font-bold text-gray-900">{item.patient}</div>
                    <div className="text-sm text-gray-500">{item.reason}</div>
                  </div>
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
        <StatCard title="Total Appointments" value={stats.appointmentsToday} icon="fa-calendar-check" trend={trends.appointmentsToday} />
        <StatCard title="New Registrations" value={stats.newRegistrations} icon="fa-user-plus" trend={trends.newRegistrations} />
        <StatCard title="Total Waitlist" value={checkInQueue.length} icon="fa-hourglass-half" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="card h-96 flex flex-col">
          <h3 className="text-lg font-semibold mb-6">Appointments by Provider</h3>
          <div className="flex-1 flex items-center justify-center text-gray-400">
            {barData.length === 0 ? "No provider data available" : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
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
            Check-in Queue
            <span className="badge badge-success">{checkInQueue.length} pending</span>
          </h3>
          <div className="overflow-y-auto space-y-3 flex-1">
            {checkInQueue.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">No patients in queue.</div>
            ) : (
              checkInQueue.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.time}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                    item.status === 'Waiting' ? 'bg-orange-100 text-orange-700' : 
                    item.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.status}
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

const PatientDashboard = ({ me, data }) => {
  if (!data || data.role !== 'patient') return null;
  const { nextVisit, healthJourney, activePrescriptions } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="card card-hero p-8 overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">My Next Visit</h2>
            {nextVisit ? (
              <>
                <div className="text-5xl font-black mb-4">{nextVisit.day}</div>
                <div className="flex items-center gap-4 text-primary-light">
                  <div className="flex flex-col">
                    <span className="text-xs opacity-80 uppercase tracking-tighter">Time</span>
                    <span className="font-bold">{nextVisit.time}</span>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div className="flex flex-col">
                    <span className="text-xs opacity-80 uppercase tracking-tighter">Doctor</span>
                    <span className="font-bold">{nextVisit.doctor}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-2xl mt-4 opacity-90">No upcoming appointments.</div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-6">Health Journey</h3>
          <div className="relative pl-8 border-l-2 border-gray-100 space-y-10">
            {healthJourney.length === 0 ? (
              <div className="text-gray-500">No medical history available yet.</div>
            ) : (
              healthJourney.map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute left-[-41px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm"></div>
                  <div className="text-xs font-bold text-primary mb-1 uppercase">{step.date}</div>
                  <div className="font-bold text-gray-900 mb-1">{step.title}</div>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-6">Active Prescriptions</h3>
          <div className="space-y-4">
            {activePrescriptions.length === 0 ? (
              <div className="text-gray-500 text-sm">No active prescriptions.</div>
            ) : (
              activePrescriptions.map((pres, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-white text-primary">
                      <i className="fa-solid fa-pills"></i>
                    </div>
                    <div className="font-bold text-gray-900">{pres.med}</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{pres.dose}</div>
                  <div className="text-xs font-semibold text-primary">{pres.duration}</div>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-6 outline">View All Records</button>
        </div>
      </div>
    </div>
  );
};

export default Overview;
