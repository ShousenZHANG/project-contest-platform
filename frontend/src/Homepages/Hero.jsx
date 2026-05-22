/**
 * Hero.jsx
 *
 * Landing hero. Refined, big-tech (Linear / Vercel / Notion) direction within the
 * locked Indigo design system: theme-aware atmospheric background (brand glow +
 * faded grid + grain), strong type hierarchy, staggered entrance, and an
 * asymmetric "product preview" card cluster instead of a generic rainbow gradient.
 *
 * Behavior preserved: CTA opens RoleSelectModal -> Login -> RegisterModal.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Trophy,
  ArrowRight,
  Gavel,
  Users,
  BarChart3,
  Award,
} from 'lucide-react';

import Login from './Login';
import RegisterModal from './RegisterModal';
import RoleSelectModal from './RoleSelectModal';
import { Button } from '../components/ui/button';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const STATS = [
  { value: '4', label: 'Roles', Icon: Users },
  { value: '100%', label: 'Self-serve', Icon: Gavel },
  { value: 'Live', label: 'Dashboards', Icon: BarChart3 },
];

function HeroPreview() {
  const bars = [42, 68, 55, 82, 60, 92];
  const metrics = [
    ['Participants', '128'],
    ['Submissions', '86'],
    ['Judges', '6'],
  ];

  return (
    <div className="relative">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Competition</p>
            <p className="text-sm font-semibold text-foreground">AI Innovation Challenge</p>
          </div>
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            Ongoing
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex h-24 items-end gap-2" aria-hidden="true">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md transition-all"
              style={{ height: `${h}%`, background: `hsl(var(--chart-${(i % 8) + 1}))` }}
            />
          ))}
        </div>
      </div>

      <div className="absolute -bottom-6 -left-8 w-56 rounded-xl border border-border bg-card p-3 shadow-elevated">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Award className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Champion</p>
            <p className="text-sm font-semibold text-foreground">Team Nebula · 96.5</p>
          </div>
        </div>
      </div>

      <div className="absolute -top-5 -right-4 rounded-xl border border-border bg-card px-3 py-2 shadow-elevated">
        <p className="text-[11px] text-muted-foreground">Avg score</p>
        <p className="text-lg font-semibold tabular-nums text-foreground">
          8.7<span className="text-xs text-muted-foreground">/10</span>
        </p>
      </div>
    </div>
  );
}

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
    <section className="relative isolate overflow-hidden">
      {/* Atmospheric background — theme-aware via design tokens */}
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-background" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 hero-glow" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid mask-fade-b" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-noise opacity-[0.04]" />

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 lg:pb-32 lg:pt-28">
        <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div variants={container} initial="hidden" animate="show">
            <motion.div
              variants={item}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              For organizers, judges &amp; participants
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.05]"
            >
              Run contests
              <br />
              <span className="text-gradient-brand">from idea to awards.</span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground"
            >
              One platform for hackathons, innovation challenges, and academic
              contests — registration, submissions, judging, and winners, without
              the spreadsheet chaos.
            </motion.p>

            <motion.div
              variants={item}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button
                size="lg"
                onClick={handleLoginClick}
                className="group h-12 px-7 text-base font-semibold"
              >
                <Trophy className="h-5 w-5" />
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-7 text-base font-semibold"
              >
                <a href="/contest-list">Browse contests</a>
              </Button>
            </motion.div>

            <motion.dl
              variants={item}
              className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-8"
            >
              {STATS.map(({ value, label, Icon }) => (
                <div key={label}>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: -1.5 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="relative hidden lg:block"
          >
            <HeroPreview />
          </motion.div>
        </div>
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
        <RegisterModal onClose={() => setShowRegister(false)} role={selectedRole} />
      )}
    </section>
  );
}

export default Hero;
