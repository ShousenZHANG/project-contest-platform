/**
 * Hero.jsx
 *
 * Vibrant hero section for the homepage. Migrated from MUI/CSS to shadcn/ui +
 * Tailwind. Uses gradient backgrounds, big bold headlines, and a primary CTA
 * that triggers the role-select / login / register modal flow.
 *
 * Behavior preserved: opens RoleSelectModal -> Login -> RegisterModal.
 *
 * Developer: Beiqi Dai (migrated)
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, ArrowRight } from 'lucide-react';

import Login from './Login';
import RegisterModal from './RegisterModal';
import RoleSelectModal from './RoleSelectModal';
import { Button } from '../components/ui/button';

function Hero() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const handleLoginClick = () => setShowRoleSelect(true);
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowRoleSelect(false);
    setShowLogin(true);
  };

  return (
    <section className="relative isolate overflow-hidden bg-background min-h-screen flex items-center">
      {/* Gradient background blobs */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-90" />
      <div
        aria-hidden="true"
        className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-pink-400/40 blur-3xl -z-10"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-400/40 blur-3xl -z-10"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15),transparent_60%)]"
      />

      <div className="max-w-7xl mx-auto px-6 py-24 w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center text-white max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium backdrop-blur ring-1 ring-white/20 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Built for organizers, judges & participants
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Effortless Contest Management
            <span className="block bg-gradient-to-r from-yellow-200 via-pink-100 to-indigo-100 bg-clip-text text-transparent">
              From Submission to Evaluation
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/85 max-w-2xl mx-auto mb-10 leading-relaxed">
            One place to launch hackathons, innovation challenges, and academic
            contests — registrations, judging, and awards without the spreadsheet
            chaos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleLoginClick}
              className="h-12 px-8 text-base font-semibold bg-white text-indigo-700 hover:bg-white/90 shadow-lg shadow-black/10 group"
            >
              <Trophy className="h-5 w-5" />
              Join now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base font-semibold bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
            >
              <a href="/contest-list">Browse contests</a>
            </Button>
          </div>
        </motion.div>
      </div>

      {showRoleSelect && (
        <RoleSelectModal
          onSelectRole={handleRoleSelect}
          onClose={() => setShowRoleSelect(false)}
        />
      )}

      {showLogin && (
        <Login
          role={selectedRole}
          onClose={() => setShowLogin(false)}
          onShowRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          role={selectedRole}
        />
      )}
    </section>
  );
}

export default Hero;
