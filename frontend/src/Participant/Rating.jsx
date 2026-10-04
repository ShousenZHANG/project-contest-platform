import { parseApiDateTime } from '@/lib/dateTime';
/**
 * Rating.jsx
 *
 * Displays a list of competitions assigned to the current judge. Migrated from MUI to shadcn/ui.
 *
 * Role: Judge
 * Developer: Zhaoyi Yang
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { judgeService } from '../services/judgeService';
import { competitionService } from '../services/competitionService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Separator } from '../components/ui/separator';
import PageError from '../shared/components/PageError';
import PageSkeleton from '../shared/components/PageSkeleton';
import Pagination from '../shared/components/Pagination';
import usePagedSearchParams from '../shared/hooks/usePagedSearchParams';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function Rating() {
  useDocumentTitle('Judge scoring queue');
  const [detailId, setDetailId] = useState(null);
  const navigate = useNavigate();
  const state = usePagedSearchParams();

  const listParams = { page: state.page, size: 10 };

  const {
    data: competitionPage,
    isPending,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.judges.competitions(listParams),
    queryFn: () => unwrap(judgeService.getMyCompetitions(listParams)),
    staleTime: staleTime.short,
  });
  const competitions = competitionPage?.data || [];

  const { data: selectedComp = null, isPending: detailPending, error: detailError, refetch: retryDetail, isFetching: detailFetching } = useQuery({
    queryKey: queryKeys.competitions.managedDetail(detailId),
    queryFn: () => unwrap(competitionService.getManagedById(detailId)),
    enabled: Boolean(detailId),
    staleTime: staleTime.medium,
  });

  const dialogOpen = Boolean(detailId);
  const setDialogOpen = (openState) => {
    if (!openState) setDetailId(null);
  };

  const fetchCompetitionDetail = (id) => setDetailId(id);

  return (
    <>
      <div className="p-6">
        <h1 className="mb-4 text-xl font-semibold text-foreground">
          Competitions Assigned to You as Judge
        </h1>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Assigned competitions">
              <table className="w-full text-sm">
                <caption className="sr-only">Competitions assigned to the current Judge</caption>
                <thead className="border-b bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isPending && (
                    <tr>
                      <td
                        colSpan={99}
                        className="px-3 py-8 text-center text-sm text-muted-foreground"
                      >
                        Loading your competitions...
                      </td>
                    </tr>
                  )}
                  {!isPending && error && (
                    <tr>
                      <td
                        colSpan={99}
                        className="px-3 py-8 text-center text-sm text-destructive"
                      >
                        <PageError error={error} onRetry={() => refetch()} retrying={isFetching} />
                      </td>
                    </tr>
                  )}
                  {!isPending &&
                    !error &&
                    competitions.map((comp, index) => (
                      <tr key={comp.id} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="px-4 py-3">{(state.page - 1) * 10 + index + 1}</td>
                        <td className="px-4 py-3">
                          <Button
                            variant="link"
                            className="min-h-11 text-left text-primary"
                            onClick={() => fetchCompetitionDetail(comp.id)}
                          >
                            {comp.name}
                          </Button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-md truncate">
                          {comp.description}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={comp.status === 'COMPLETED' ? 'success' : 'secondary'}>
                            {comp.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            className="min-h-11"
                            disabled={!['COMPLETED', 'AWARDED'].includes(comp.status)}
                            onClick={() => navigate(`/JudgeSubmissions/${comp.id}`)}
                          >
                            {comp.status === 'AWARDED' ? 'View scores' : 'Open scoring queue'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  {!isPending && !error && competitions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No competitions assigned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {!isPending && !error && <Pagination page={state.page} pages={competitionPage?.pages} total={competitionPage?.total ?? competitions.length}
          onPageChange={state.setPage} busy={isFetching} />}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedComp?.name || 'Competition details'}</span>
              {selectedComp?.status && <Badge variant="default">{selectedComp.status}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {detailPending ? <PageSkeleton rows={3} /> : detailError ? <PageError error={detailError} onRetry={() => retryDetail()} retrying={detailFetching} /> : null}
          {selectedComp && (
            <div className="space-y-3 text-sm">
              <p>{selectedComp.description}</p>
              <Separator />
              <p>
                <strong>Category:</strong> {selectedComp.category}
              </p>
              <p>
                <strong>Participation:</strong> {selectedComp.participationType}
              </p>
              <p>
                <strong>Start:</strong> {parseApiDateTime(selectedComp.startDate).toLocaleString()}
              </p>
              <p>
                <strong>End:</strong> {parseApiDateTime(selectedComp.endDate).toLocaleString()}
              </p>
              <p>
                <strong>Public:</strong> {selectedComp.isPublic ? 'Yes' : 'No'}
              </p>
              <Separator />
              <div>
                <p className="font-medium">Scoring Criteria:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedComp.scoringCriteria?.map((item, idx) => (
                    <Badge key={idx} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium">Allowed Submission Types:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedComp.allowedSubmissionTypes?.map((item, idx) => (
                    <Badge key={idx} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
              {selectedComp.imageUrls?.length > 0 && (
                <div>
                  <p className="font-medium">Display Images:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedComp.imageUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`img-${idx}`}
                        className="h-24 w-32 rounded-md border object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
              {selectedComp.introVideoUrl && (
                <Button variant="outline" asChild>
                  <a href={selectedComp.introVideoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Watch Intro Video
                  </a>
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Rating;
