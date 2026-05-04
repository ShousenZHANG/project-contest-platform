import React from 'react';
import { BookOpen, Briefcase, CheckCircle2, Trophy, Users } from 'lucide-react';
import Navbar from '../Homepages/Navbar';
import Footer from '../Homepages/Footer';

const sections = [
  {
    title: 'Public users',
    icon: Users,
    items: [
      'Browse all public competitions without signing in.',
      'Search and filter competitions by name, status, category, and participation type.',
      'Open competition details to review requirements, timelines, awards, teams, and submissions.',
      'Create an account when you are ready to join, vote, or comment.',
    ],
  },
  {
    title: 'Participants',
    icon: Trophy,
    items: [
      'Manage your profile and keep your account details current.',
      'Join individual or team competitions from the participant workspace.',
      'Submit projects, track submission status, and review judging feedback.',
      'Follow ratings and comments so you can improve before final evaluation.',
    ],
  },
  {
    title: 'Organizers',
    icon: Briefcase,
    items: [
      'Create competitions with rules, timelines, media, and scoring criteria.',
      'Manage participants, teams, judges, and submitted work from one workspace.',
      'Review and approve submissions before public display or final scoring.',
      'Publish results and monitor competition health through dashboard metrics.',
    ],
  },
];

function HowToUse() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <section className="mb-8 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="grid gap-8 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-10">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <BookOpen className="h-3.5 w-3.5" />
                  Platform guide
                </div>
                <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  How to use Questora
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  Questora supports the full competition lifecycle: public discovery,
                  participant submissions, organizer operations, and judge-ready review flows.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                {['Discover', 'Submit', 'Evaluate'].map((step) => (
                  <div key={step} className="rounded-lg border border-border bg-muted/40 p-4">
                    <CheckCircle2 className="mb-3 h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold text-foreground">{step}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Clear workflows for every role.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {sections.map(({ title, icon: Icon, items }) => (
              <article
                key={title}
                className="rounded-lg border border-border bg-card p-6 shadow-sm transition-colors hover:bg-accent/30"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                </div>
                <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                  {items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default HowToUse;
