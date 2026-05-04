/**
 * @file Dashboard.jsx
 * @description
 * Organizer analytical dashboard. Migrated from MUI to shadcn/ui.
 * Recharts (kept) for pie/line visualisations. Tooltip via shadcn primitive.
 *
 * Role: Organizer
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from 'recharts';
import apiClient from '../api/apiClient';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
  '#a4de6c',
  '#d0ed57',
];

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function MetricCard({ label, value, unit = '', tooltipRows = [] }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="cursor-default transition-colors hover:bg-accent/40">
            <CardContent className="flex flex-col gap-1 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {value}
                {unit}
              </p>
            </CardContent>
          </Card>
        </TooltipTrigger>
        {tooltipRows.length > 0 && (
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              {tooltipRows.map((r) => (
                <p key={r.name} className="text-xs">
                  {r.name}: <strong>{r.value}</strong>
                </p>
              ))}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function OrganizerDashboard() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComp, setSelectedComp] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/competitions/achieve/my?page=1&size=100');
        const { data: competitions = [] } = res.data;

        const list = await Promise.all(
          competitions.map(async (c) => {
            const [statRes, detailRes] = await Promise.all([
              apiClient.get(`/dashboard/public/statistics?competitionId=${c.id}`),
              apiClient.get(`/competitions/${c.id}`),
            ]);
            const stat = statRes.data;
            const detail = detailRes.data;

            const totalSubs = stat.submissionCount || 0;
            const approved = stat.approvedSubmissionCount || 0;

            return {
              id: c.id,
              name: c.name,
              status: (detail.status || detail.competitionStatus || 'UNKNOWN').toUpperCase(),
              regs:
                stat.participationType === 'INDIVIDUAL'
                  ? stat.individualParticipantCount || 0
                  : stat.teamParticipantCount || 0,
              subs: totalSubs,
              judges: stat.judgeCount || 0,
              approvePct: totalSubs > 0 ? (approved / totalSubs) * 100 : 0,
              trend:
                Object.keys(stat.individualParticipantTrend || {}).length > 0
                  ? stat.individualParticipantTrend
                  : Object.keys(stat.teamParticipantTrend || {}).length > 0
                    ? stat.teamParticipantTrend
                    : stat.submissionTrend,
            };
          })
        );

        setStats(list);
      } catch {
        // fetch error handled silently
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { totals, tooltipMap } = useMemo(() => {
    const sum = { regs: 0, subs: 0, judges: 0 };
    const listRegs = [];
    const listSubs = [];
    const listJudges = [];
    const listApprove = [];

    stats.forEach((s) => {
      sum.regs += s.regs;
      sum.subs += s.subs;
      sum.judges += s.judges;

      listRegs.push({ name: s.name, value: s.regs });
      listSubs.push({ name: s.name, value: s.subs });
      listJudges.push({ name: s.name, value: s.judges });
      listApprove.push({ name: s.name, value: `${s.approvePct.toFixed(1)}%` });
    });

    const approvePct =
      sum.subs > 0
        ? Number(
            (
              (stats.reduce((acc, s) => acc + s.subs * (s.approvePct / 100), 0) /
                sum.subs) *
              100
            ).toFixed(1)
          )
        : 0;

    return {
      totals: { ...sum, approvePct },
      tooltipMap: {
        regs: listRegs,
        subs: listSubs,
        judges: listJudges,
        approvePct: listApprove,
      },
    };
  }, [stats]);

  const statusPie = useMemo(() => {
    const count = {};
    stats.forEach((s) => {
      count[s.status] = (count[s.status] || 0) + 1;
    });
    return Object.entries(count).map(([name, value], i) => ({
      name,
      value,
      fill: COLORS[i % COLORS.length],
    }));
  }, [stats]);

  const hasTrendData = useMemo(
    () => stats.some((s) => Object.keys(s.trend || {}).length > 0),
    [stats]
  );

  const currentTrend = useMemo(() => {
    const t = stats.find((s) => s.id === selectedComp);
    if (!t) return [];
    return Object.entries(t.trend || {}).map(([date, count]) => ({ date, count }));
  }, [selectedComp, stats]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Competition Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated metrics across your competitions.
        </p>
      </div>

      {loading ? (
        <div
          className="flex justify-center py-12"
          role="progressbar"
          aria-label="Loading competition dashboard"
          aria-busy="true"
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : stats.length === 0 ? (
        <p className="text-sm text-muted-foreground">(No competitions yet)</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Overall Metrics</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Participants" value={totals.regs} tooltipRows={tooltipMap.regs} />
              <MetricCard label="Submissions" value={totals.subs} tooltipRows={tooltipMap.subs} />
              <MetricCard label="Judges" value={totals.judges} tooltipRows={tooltipMap.judges} />
              <MetricCard
                label="Approval Rate"
                value={totals.approvePct}
                unit="%"
                tooltipRows={tooltipMap.approvePct}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-2 text-sm font-semibold text-foreground">Status Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
                      label
                    >
                      {statusPie.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {hasTrendData && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="mb-2 text-sm font-semibold text-foreground">Trend Viewer</h2>
                  <div className="mb-3 max-w-xs space-y-1.5">
                    <Label htmlFor="comp-select" className="text-xs">
                      Select competition
                    </Label>
                    <select
                      id="comp-select"
                      value={selectedComp}
                      onChange={(e) => setSelectedComp(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="" disabled>
                        Select a competition
                      </option>
                      {stats
                        .filter((s) => Object.keys(s.trend || {}).length > 0)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {currentTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={currentTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={11} />
                        <YAxis allowDecimals={false} fontSize={11} />
                        <ReTooltip />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#8884d8"
                          dot={{ r: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-muted-foreground">(No trend data)</p>
                  )}
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default OrganizerDashboard;
