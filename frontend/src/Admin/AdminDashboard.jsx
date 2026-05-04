/**
 * @file AdminDashboard.jsx
 * @description
 * Administrative dashboard. Migrated from MUI to shadcn/ui + Tailwind while
 * keeping recharts for visualisations. Shows headline KPIs (4-up grid with
 * subtle gradient backgrounds), participant/submission breakdowns, and trend
 * lines for submissions and participants.
 *
 * Role: Admin
 * Developer: Zhaoyi Yang
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  Trophy,
  Users,
  FileCheck,
  PercentCircle,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { Card, CardContent } from '../components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { cn } from '../lib/utils';

const COLORS = ['#6366f1', '#f97316', '#10b981', '#a855f7'];

const KPI_STYLES = {
  competitions: {
    icon: Trophy,
    gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
    iconClass: 'text-indigo-500 bg-indigo-500/10',
  },
  participants: {
    icon: Users,
    gradient: 'from-orange-500/10 via-orange-500/5 to-transparent',
    iconClass: 'text-orange-500 bg-orange-500/10',
  },
  submissions: {
    icon: FileCheck,
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    iconClass: 'text-emerald-500 bg-emerald-500/10',
  },
  approval: {
    icon: PercentCircle,
    gradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
    iconClass: 'text-purple-500 bg-purple-500/10',
  },
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && (
        <p className="mb-1 font-medium text-foreground">{label}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry) => (
          <div
            key={entry.dataKey}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}:</span>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ id, title, value, tooltip = [] }) {
  const styles = KPI_STYLES[id] || KPI_STYLES.competitions;
  const Icon = styles.icon;

  const card = (
    <Card
      className={cn(
        'relative overflow-hidden bg-gradient-to-br',
        styles.gradient
      )}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            styles.iconClass
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip.length === 0) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">{card}</div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-0.5">
          {tooltip.map((t) => (
            <div key={t.k} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t.k}</span>
              <span className="font-medium text-foreground">{t.v}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/dashboard/public/platform-overview');
        setOverview(res.data || null);
      } catch {
        toast.error('Failed to load platform overview');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const {
    cards,
    barData,
    submissionTrend,
    participantTrend,
    hasParticipantTrend,
  } = useMemo(() => {
    if (!overview) {
      return {
        cards: [],
        barData: [],
        submissionTrend: [],
        participantTrend: [],
        hasParticipantTrend: false,
      };
    }

    const approvePct =
      overview.totalSubmissions > 0
        ? Number(
            (
              (overview.approvedSubmissions / overview.totalSubmissions) *
              100
            ).toFixed(1)
          )
        : 0;

    const upcoming =
      overview.totalCompetitions -
      overview.activeCompetitions -
      overview.finishedCompetitions;

    const cardsArr = [
      {
        id: 'competitions',
        title: 'Competitions',
        value: overview.totalCompetitions,
        tooltip: [
          { k: 'Active', v: overview.activeCompetitions },
          { k: 'Finished', v: overview.finishedCompetitions },
          { k: 'Upcoming', v: upcoming },
        ],
      },
      {
        id: 'participants',
        title: 'Participants',
        value: overview.totalParticipants,
        tooltip: [
          { k: 'Individual', v: overview.individualParticipants },
          { k: 'Team', v: overview.teamParticipants },
        ],
      },
      {
        id: 'submissions',
        title: 'Submissions',
        value: overview.totalSubmissions,
        tooltip: [
          { k: 'Individual', v: overview.individualSubmissions },
          { k: 'Team', v: overview.teamSubmissions },
          { k: 'Approved', v: overview.approvedSubmissions },
        ],
      },
      {
        id: 'approval',
        title: 'Approval Rate',
        value: `${approvePct}%`,
      },
    ];

    const barArr = [
      {
        name: 'Counts',
        'Ind Participants': overview.individualParticipants,
        'Team Participants': overview.teamParticipants,
        'Ind Submissions': overview.individualSubmissions,
        'Team Submissions': overview.teamSubmissions,
      },
    ];

    const subTrendMap = overview.submissionTrend || {};
    const submissionTrendArr = Object.keys(subTrendMap)
      .sort()
      .map((d) => ({ date: d, value: subTrendMap[d] }));

    const partTrend = overview.participantTrend || {};
    const indMap = partTrend.individual || {};
    const teamMap = partTrend.team || {};
    const mergedDates = Array.from(
      new Set([...Object.keys(indMap), ...Object.keys(teamMap)])
    ).sort();
    const participantTrendArr = mergedDates.map((d) => ({
      date: d,
      individual: indMap[d] || 0,
      team: teamMap[d] || 0,
    }));

    return {
      cards: cardsArr,
      barData: barArr,
      submissionTrend: submissionTrendArr,
      participantTrend: participantTrendArr,
      hasParticipantTrend: participantTrendArr.length > 0,
    };
  }, [overview]);

  if (loading) {
    return (
      <div
        className="flex h-64 items-center justify-center"
        role="status"
        aria-label="Loading platform dashboard"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading platform dashboard</span>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">No data available.</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Platform Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Live overview of competitions, participation, and submissions.
          </p>
        </div>

        {/* KPI grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <MetricCard key={card.id} {...card} />
          ))}
        </div>

        {/* Breakdown chart */}
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-medium">
              Participant / Submission Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} barGap={4} maxBarSize={40}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="name" hide />
                <YAxis
                  allowDecimals={false}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReTooltip content={<ChartTooltip />} />
                <Bar dataKey="Ind Participants" stackId="a" fill={COLORS[0]} />
                <Bar dataKey="Team Participants" stackId="a" fill={COLORS[1]} />
                <Bar dataKey="Ind Submissions" stackId="b" fill={COLORS[2]} />
                <Bar dataKey="Team Submissions" stackId="b" fill={COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend tabs */}
        <Card>
          <CardContent className="p-4">
            <Tabs defaultValue="submission" className="w-full">
              <TabsList>
                <TabsTrigger value="submission">Submission Trend</TabsTrigger>
                {hasParticipantTrend && (
                  <TabsTrigger value="participant">
                    Participant Trend
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="submission" className="pt-2">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={submissionTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <ReTooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={COLORS[0]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="Submissions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              {hasParticipantTrend && (
                <TabsContent value="participant" className="pt-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={participantTrend}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <ReTooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="individual"
                        stroke={COLORS[0]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        name="Individual"
                      />
                      <Line
                        type="monotone"
                        dataKey="team"
                        stroke={COLORS[1]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        name="Team"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

export default AdminDashboard;
