import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { applyTheme } from '../utils/theme';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // Reset theme to default on landing page if not logged in
    if (!localStorage.getItem("access_token")) {
      applyTheme("green");
    }
  }, []);

  const contactInfo = {
    fixe: "+212 522 20 20 20",
    whatsapp: "+212 600 00 00 00",
    adresse: "ISGA CASABLANCA, 393 Rte d'El Jadida, Casablanca 20250"
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-[#e0e3e5] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#2E8D78] rounded-xl flex items-center justify-center text-white shadow-lg">
            <i className="fa-solid fa-heart-pulse" style={{ fontSize: '20px' }}></i>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#2E8D78]">MedPredict</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="px-6 py-2 border-2 border-[#2E8D78] text-[#2E8D78] rounded-full font-semibold hover:bg-[#2E8D78] hover:text-white transition-all duration-300"
        >
          Connexion
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 flex flex-col items-center justify-center text-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl z-10"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#191c1e] leading-tight mb-4">
            <span className="text-[#2E8D78]">MedPredict</span> : Plateforme de suivi patient et diagnostic assisté.
          </h1>
          <p className="text-xl md:text-2xl font-medium text-gray-500 mb-12 italic">
            Réalisée par <span className="text-[#191c1e] font-bold">Tarek, Hamza et Abdellah</span>
          </p>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex justify-center"
          >
            <button 
              onClick={() => setShowHelp(true)}
              className="bg-[#2E8D78] text-white px-10 py-5 rounded-full text-xl font-bold shadow-xl hover:bg-[#1F6354] transition-all flex items-center gap-3"
            >
              Demander de l'aide <i className="fa-solid fa-circle-question"></i>
            </button>
          </motion.div>
        </motion.div>

        {/* Floating background elements */}
        <div className="absolute top-40 -left-20 w-72 h-72 bg-[#2E8D78]/10 rounded-full blur-3xl -z-0"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-[#2E8D78]/5 rounded-full blur-3xl -z-0"></div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: <i className="fa-solid fa-heart-pulse" style={{ fontSize: '32px' }}></i>, 
              title: "Diagnostic IA", 
              desc: "Modèles d'apprentissage automatique avancés pour la détection précoce des maladies et l'évaluation des risques." 
            },
            { 
              icon: <i className="fa-regular fa-calendar-days" style={{ fontSize: '32px' }}></i>, 
              title: "Planning Intelligent", 
              desc: "Gérez sans effort les rendez-vous et les consultations des patients en temps réel." 
            },
            { 
              icon: <i className="fa-solid fa-shield-halved" style={{ fontSize: '32px' }}></i>, 
              title: "Dossiers Sécurisés", 
              desc: "Vos données sont cryptées et stockées selon les normes médicales les plus strictes." 
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
              <div className="mb-6 p-4 bg-[#2E8D78]/10 rounded-2xl inline-block group-hover:bg-[#2E8D78] group-hover:text-white transition-colors duration-300">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
              <p className="text-[#3d4945] leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Help Modal Overlay */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Style "Patient Consultation" */}
              <div className="bg-[#48B39B]/10 p-8 text-center border-b border-[#48B39B]/5">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-[#48B39B]">
                   <i className="fa-solid fa-headset text-2xl"></i>
                </div>
                <h2 className="text-2xl font-black text-[#191c1e] tracking-tight">Besoin d'assistance ?</h2>
                <p className="text-[#48B39B] font-bold text-sm uppercase tracking-widest mt-2">Nous sommes là pour vous</p>
              </div>

              <div className="p-8 space-y-6">
                <p className="text-gray-600 text-center font-medium">Vous pouvez contacter la clinique directement via les canaux suivants :</p>
                
                <div className="space-y-4">
                  {/* Phone */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#48B39B]/30 transition-colors">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#48B39B] shadow-sm">
                      <i className="fa-solid fa-phone"></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ligne Fixe</p>
                      <p className="text-lg font-bold text-[#191c1e]">{contactInfo.fixe}</p>
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#48B39B]/30 transition-colors">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#25D366] shadow-sm">
                      <i className="fa-brands fa-whatsapp text-xl"></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">WhatsApp Business</p>
                      <p className="text-lg font-bold text-[#191c1e]">{contactInfo.whatsapp}</p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#48B39B]/30 transition-colors">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                      <i className="fa-solid fa-location-dot"></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Adresse</p>
                      <p className="text-sm font-bold text-[#191c1e] leading-snug">{contactInfo.adresse}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowHelp(false)}
                  className="w-full py-4 bg-[#191c1e] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
                >
                  Fermer
                </button>
              </div>

              {/* Close Button Top Right */}
              <button 
                onClick={() => setShowHelp(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-white/50 hover:bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#e0e3e5] text-center text-[#3d4945]">
        <p>© 2026 MedPredict AI. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
