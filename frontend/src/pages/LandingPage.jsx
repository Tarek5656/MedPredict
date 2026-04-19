import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-[#e0e3e5] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#48B39B] rounded-xl flex items-center justify-center text-white shadow-lg">
            <i className="fa-solid fa-heart-pulse" style={{ fontSize: '20px' }}></i>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#48B39B]">MedPredict</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="px-6 py-2 border-2 border-[#48B39B] text-[#48B39B] rounded-full font-semibold hover:bg-[#48B39B] hover:text-white transition-all duration-300"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl z-10"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#191c1e] leading-tight mb-6">
            The Future of <span className="text-[#48B39B]">Health Prediction</span>, Today.
          </h1>
          <p className="text-xl text-[#3d4945] mb-10 max-w-2xl mx-auto leading-relaxed">
            Harness the power of AI to analyze medical data, manage consultations, and predict outcomes with surgical precision. 
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <button 
              onClick={() => navigate('/login')}
              className="bg-[#48B39B] text-white px-10 py-5 rounded-full text-xl font-bold shadow-xl hover:bg-[#2E8D78] transition-all flex items-center gap-3"
            >
              Get Started for Free <i className="fa-solid fa-arrow-right"></i>
            </button>
          </motion.div>
        </motion.div>

        {/* Floating background elements */}
        <div className="absolute top-40 -left-20 w-72 h-72 bg-[#48B39B]/10 rounded-full blur-3xl -z-0"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-[#48B39B]/5 rounded-full blur-3xl -z-0"></div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: <i className="fa-solid fa-heart-pulse" style={{ fontSize: '32px' }}></i>, 
              title: "AI Diagnosis", 
              desc: "Advanced machine learning models for early disease detection and risk assessment." 
            },
            { 
              icon: <i className="fa-regular fa-calendar-days" style={{ fontSize: '32px' }}></i>, 
              title: "Smart Scheduling", 
              desc: "Effortlessly manage appointments and patient consultations in real-time." 
            },
            { 
              icon: <i className="fa-solid fa-shield-halved" style={{ fontSize: '32px' }}></i>, 
              title: "Secure Records", 
              desc: "Your data is encrypted and stored according to the highest medical standards." 
            }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="bg-white p-8 rounded-[32px] shadow-md border border-white/50 hover:shadow-lg transition-all group"
            >
              <div className="mb-6 p-4 bg-[#48B39B]/10 rounded-2xl inline-block group-hover:bg-[#48B39B] group-hover:text-white transition-colors duration-300">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
              <p className="text-[#3d4945] leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#e0e3e5] text-center text-[#3d4945]">
        <p>© 2026 MedPredict AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
