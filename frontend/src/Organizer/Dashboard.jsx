/**
 * @file Dashboard.jsx
 * @description
 * Organizer analytical dashboard. Migrated from MUI to shadcn/ui.
 * Recharts (kept) for pie/line visualisations. Tooltip via shadcn primitive.
 *
 * Role: Organizer
 */

import React, { useState, useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { getChartColors } from '../lib/chartColors';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
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
import { competitionService } from '../services/competitionService';
import { dashboardService } from '../services/judgeService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap } from '../api/queryFn';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import PageError from '../shared/components/PageError';
import Pagination from '../shared/components/Pagination';
import usePagedSearchParams from '../shared/hooks/usePagedSearchParams';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';


const SELECT_CLASS =
  'flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function MetricCard({ label, value, unit = '', tooltipRows = [] }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card tabIndex={tooltipRows.length ? 0 : undefined} className="cursor-default transition-colors hover:bg-accent/40">
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
  useDocumentTitle('Competition Dashboard');
  const colors = useMemo(() => getChartColors(), []);
  const [selectedComp, setSelectedComp] = useState('');
  const paging = usePagedSearchParams();

  const listParams = { page: paging.page, size: 10 };

  const {
    data: listPage,
    isPending: listPending,
    error: listError,
    isFetching: listFetching,
    refetch: retryList,
  } = useQuery({
    queryKey: queryKeys.competitions.mine(listParams),
    queryFn: () => unwrap(competitionService.getMyOrganized(listParams)),
    staleTime: staleTime.short,
  });
  const competitions = listPage?.data || [];

  // The paged list already has metadata. Fetch statistics only for its 10
  // contests, keeping the request count bounded to 1 list + at most 10 reads.
  const statQueries = useQueries({
    queries: competitions.map((c) => ({
      queryKey: [...queryKeys.dashboard.organizer(), c.id],
      queryFn: () => unwrap(dashboardService.getManagedCompetitionStatistics(c.id)),
      staleTime: staleTime.medium,
    })),
  });

  const loading =
    listPending ||
    statQueries.some((q) => q.isPending);

  const error =
    listError ||
    statQueries.find((q) => q.error)?.error ||
    null;

  // Not memoized on purpose: useQueries hands back a fresh array every render,
  // so a useMemo keyed on it would recompute anyway while looking like it did
  // not. The map is over at most 10 rows on the current page.
  const stats = competitions.map((c, i) => {
    const stat = statQueries[i]?.data ?? {};

    const totalSubs = stat.submissionCount || 0;
    const approved = stat.approvedSubmissionCount || 0;

    return {
      id: c.id,
      name: c.name,
      status: (c.status || 'UNKNOWN').toUpperCase(),
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
      trendLabel:
        Object.keys(stat.individualParticipantTrend || {}).length > 0
          ? 'Individual registrations'
          : Object.keys(stat.teamParticipantTrend || {}).length > 0
            ? 'Team registrations'
            : 'Submissions',
    };
  });

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
      fill: colors[i % colors.length],
    }));
  }, [stats, colors]);

  const hasTrendData = useMemo(
    () => stats.some((s) => Object.keys(s.trend || {}).length > 0),
    [stats]
  );

  const selectedStat = stats.find((s) => s.id === selectedComp);
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
          Browse your competitions 10 at a time. Metrics and status distribution cover the current page; the trend viewer covers the selected competition.
        </p>
        {listPage && <p className="mt-2 text-sm text-muted-foreground" role="status">
          {competitions.length ? `Showing competitions ${(paging.page - 1) * 10 + 1}–${(paging.page - 1) * 10 + competitions.length}` : 'No competitions on this page'} of {listPage.total ?? competitions.length} total.
        </p>}
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
      ) : error ? (
        <PageError error={error} retrying={listFetching || statQueries.some((query) => query.isFetching)} onRetry={() => {
          if (listError) retryList();
          statQueries.filter((query) => query.error).forEach((query) => query.refetch());
        }} />
      ) : stats.length === 0 ? (
        <p className="text-sm text-muted-foreground">No competitions on this page. Use the pagination controls to return to an earlier page.</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Current page metrics · {stats.length} competitions</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Participants / teams registered" value={totals.regs} tooltipRows={tooltipMap.regs} />
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
                <h2 className="mb-2 text-sm font-semibold text-foreground">Status Distribution · current page</h2>
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
                      value={selectedStat ? selectedComp : ''}
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
                  {selectedStat && <p className="mb-3 text-sm text-muted-foreground">{selectedStat.name} · {selectedStat.trendLabel}. This chart shows only the selected competition.</p>}

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
                          stroke={colors[0]}
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
      <Pagination page={paging.page} pages={listPage?.pages} total={listPage?.total ?? competitions.length}
        onPageChange={(page) => { setSelectedComp(''); paging.setPage(page); }} busy={loading || listFetching} />
    </div>
  );
}

export default OrganizerDashboard;
