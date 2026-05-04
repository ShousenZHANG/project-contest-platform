/**
 * @file SubmissionRatings.jsx
 * @description
 * Compare submission scores across criteria with sortable columns and trigger
 * automatic winner award. Migrated from MUI to shadcn/ui.
 *
 * Role: Organizer
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

function SortIcon({ active, direction }) {
  if (!active) return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground" />;
  return direction === 'asc' ? (
    <ArrowUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3" />
  );
}

function SubmissionRatings() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'totalScore', direction: 'desc' });

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/winners/scored-list?competitionId=${competitionId}`
      );
      const data = res.data;
      if (Array.isArray(data.data)) {
        setSubmissions(data.data);
      }
    } catch {
      // fetch error handled silently
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const allCriteria = useMemo(
    () =>
      Array.from(
        new Set(
          submissions.flatMap((sub) =>
            sub.criterionScores ? Object.keys(sub.criterionScores) : []
          )
        )
      ),
    [submissions]
  );

  const sortedSubmissions = useMemo(() => {
    const sorted = [...submissions];
    const { key, direction } = sortConfig;

    sorted.sort((a, b) => {
      let aValue, bValue;
      if (key === 'totalScore') {
        aValue = a.totalScore ?? 0;
        bValue = b.totalScore ?? 0;
      } else {
        aValue = a.criterionScores?.[key] ?? 0;
        bValue = b.criterionScores?.[key] ?? 0;
      }
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [submissions, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleAutoAward = async () => {
    try {
      await apiClient.post(`/winners/auto-award?competitionId=${competitionId}`);
      toast.success('Auto-award completed successfully');
      fetchRatings();
    } catch (error) {
      const status = error.response?.status;
      if (status === 400) {
        toast.warning('No scored submissions found.');
      } else if (status === 403) {
        toast.error('You are not authorized to award.');
      } else {
        toast.error('Failed to connect to server.');
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Rated Submissions Comparison</h1>
        <p className="text-sm text-muted-foreground">
          Click a column header to sort by total or individual criterion.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sortedSubmissions.length > 0 ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Title</th>
                <th
                  className="cursor-pointer select-none px-3 py-2 hover:bg-muted/60"
                  onClick={() => handleSort('totalScore')}
                >
                  Total Score
                  <SortIcon
                    active={sortConfig.key === 'totalScore'}
                    direction={sortConfig.direction}
                  />
                </th>
                {allCriteria.map((criterion) => (
                  <th
                    key={criterion}
                    className="cursor-pointer select-none px-3 py-2 hover:bg-muted/60"
                    onClick={() => handleSort(criterion)}
                  >
                    {criterion}
                    <SortIcon
                      active={sortConfig.key === criterion}
                      direction={sortConfig.direction}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSubmissions.map((sub) => (
                <tr
                  key={sub.submissionId}
                  className="border-b border-border last:border-0 hover:bg-muted/40"
                >
                  <td className="px-3 py-1.5 font-medium text-foreground">{sub.title}</td>
                  <td className="px-3 py-1.5 font-semibold text-foreground">{sub.totalScore}</td>
                  {allCriteria.map((criterion) => (
                    <td key={criterion} className="px-3 py-1.5 text-muted-foreground">
                      {sub.criterionScores?.[criterion] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          No scored submissions found for this competition.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={handleAutoAward}
          className="bg-success text-success-foreground hover:bg-success/90"
        >
          <Trophy className="mr-1 h-4 w-4" />
          Auto Award Winners
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/OrganizerSubmissions/${competitionId}`)}
        >
          Back to Submissions List
        </Button>
      </div>
    </div>
  );
}

export default SubmissionRatings;
