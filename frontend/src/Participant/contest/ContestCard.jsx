/**
 * ContestCard.jsx
 *
 * Participant contest card. Migrated from MUI to shadcn/ui.
 *
 * Role: Participant
 * Developer: Zhaoyi Yang, Beiqi Dai
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Flag, Eye, Tag, Play, Clock, Lock, Loader2 } from 'lucide-react';
import { teamService } from '../../services/teamService';
import { registrationService, submissionService } from '../../services/registrationService';
import { queryKeys, staleTime } from '../../api/queryKeys';
import { unwrap } from '../../api/queryFn';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import AuthTokenManager from '@/auth/authTokenManager';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

function ContestCard({ contest, onLoginRequest }) {
  const navigate = useNavigate();
  const [openRegDialog, setOpenRegDialog] = useState(false);
  const [openTeamDialog, setOpenTeamDialog] = useState(false);
  const [createdTeams, setCreatedTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const queryClient = useQueryClient();
  const signedIn = Boolean(AuthTokenManager.getToken());
  const statusKey = [...queryKeys.registrations.all, 'status', contest?.id];

  // Individual registration status, so the button can say whether the user is
  // already in and the mutations have something to flip.
  const { data: isRegistered = false } = useQuery({
    queryKey: statusKey,
    queryFn: () => unwrap(registrationService.getStatus(contest.id)),
    select: (value) => value === true || value === 'true',
    enabled:
      signedIn && Boolean(contest?.id) && contest?.participationType !== 'TEAM',
    staleTime: staleTime.short,
  });

  /** Flip the cached status and hand back the previous value for rollback. */
  const setStatusOptimistically = async (next) => {
    await queryClient.cancelQueries({ queryKey: statusKey });
    const previous = queryClient.getQueryData(statusKey);
    queryClient.setQueryData(statusKey, next);
    return { previous };
  };

  const invalidateRegistrations = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });

  // Read through the cache: the status of a team the participant just looked
  // at does not need a second round trip.
  const checkTeamStatus = async (teamId) => {
    try {
      const status = await queryClient.fetchQuery({
        queryKey: [
          ...queryKeys.registrations.all,
          'teamStatus',
          contest.id,
          teamId,
        ],
        queryFn: () => unwrap(registrationService.getTeamStatus(contest.id, teamId)),
        staleTime: staleTime.live,
      });
      return status === true || status === 'true';
    } catch {
      return false;
    }
  };

  const fetchCreatedTeams = async () => {
    const params = { userId: AuthTokenManager.getUserId(), page: 1, size: 100 };
    setTeamsLoading(true);
    try {
      const payload = await queryClient.fetchQuery({
        queryKey: queryKeys.teams.created(params),
        queryFn: () => unwrap(teamService.getCreatedTeams(params)),
        staleTime: staleTime.medium,
      });
      const teams = (payload && payload.data) || [];
      setCreatedTeams(teams);
      return teams;
    } catch {
      toast.error('Failed to load your teams.');
    } finally {
      setTeamsLoading(false);
    }
    return [];
  };

  const registerTeamMutation = useMutation({
    mutationFn: (teamId) =>
      unwrap(registrationService.registerTeam(contest.id, teamId)),
    onSuccess: () => {
      toast.success('Team registered successfully!');
      invalidateRegistrations();
    },
    onError: () => toast.error('Team registration failed.'),
  });

  const cancelTeamMutation = useMutation({
    mutationFn: (teamId) => unwrap(registrationService.cancelTeam(contest.id, teamId)),
    onSuccess: () => {
      toast.success('Team registration cancelled!');
      invalidateRegistrations();
    },
    onError: () => toast.error('Team cancellation failed.'),
    onSettled: () => setOpenTeamDialog(false),
  });

  const registerIndividual = useMutation({
    mutationFn: () => unwrap(registrationService.register(contest.id)),
    onMutate: () => setStatusOptimistically(true),
    onSuccess: () => toast.success('Registration successful!'),
    onError: (err, _vars, context) => {
      const data = err.response?.data;
      const text = typeof data === 'string' ? data : JSON.stringify(data || '');
      // 'Already registered' means the optimistic value was right all along.
      if (text.includes('already registered')) {
        setOpenRegDialog(true);
        return;
      }
      if (context?.previous !== undefined) {
        queryClient.setQueryData(statusKey, context.previous);
      }
      toast.error('Registration failed.');
    },
    onSettled: invalidateRegistrations,
  });

  const cancelIndividual = useMutation({
    mutationFn: () => unwrap(registrationService.cancel(contest.id)),
    onMutate: () => setStatusOptimistically(false),
    onSuccess: () => toast.success('Cancelled successfully!'),
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(statusKey, context.previous);
      }
      toast.error('Cancellation failed.');
    },
    onSettled: () => {
      setOpenRegDialog(false);
      invalidateRegistrations();
    },
  });

  const registerTeam = (teamId) => registerTeamMutation.mutateAsync(teamId).catch(() => {});
  const cancelTeamRegistration = (teamId) =>
    cancelTeamMutation.mutateAsync(teamId).catch(() => {});

  const handleJoinClick = async (e) => {
    e.stopPropagation();

    if (contest.status !== 'ONGOING') {
      toast.warning('You can only join ongoing competitions.');
      return;
    }

    const token = AuthTokenManager.getToken();
    if (!token) {
      if (onLoginRequest) onLoginRequest();
      else toast.warning('Please log in first!');
      return;
    }

    if (contest.participationType === 'TEAM') {
      await fetchCreatedTeams();
      setOpenTeamDialog(true);
      return;
    }

    // Already in: open the cancel prompt rather than provoking a failed
    // registration to reach it.
    if (isRegistered) {
      setOpenRegDialog(true);
      return;
    }

    registerIndividual.mutate();
  };

  const handleCancelRegistration = () => cancelIndividual.mutate();

  const handleViewSubmission = async (e) => {
    e.stopPropagation();

    if (!contest?.id) {
      toast.error('Invalid contest ID.');
      return;
    }

    try {
      const approvedParams = { competitionId: contest.id };
      const payload = await queryClient.fetchQuery({
        queryKey: [...queryKeys.submissions.all, 'approved', approvedParams],
        queryFn: () => unwrap(submissionService.getApproved(approvedParams)),
        staleTime: staleTime.short,
      });
      const submissions = (payload && payload.data) || [];
      if (submissions.length === 0) {
        toast.info('No approved submissions yet.');
        return;
      }
      navigate(`/view-submission/${contest.id}`);
    } catch (err) {
      toast.error('Network error fetching submissions.');
    }
  };

  const statusBadge = () => {
    const status = contest.status;
    const Icon = status === 'ONGOING' ? Play : status === 'UPCOMING' ? Clock : Lock;
    const variant =
      status === 'ONGOING' ? 'warning' : status === 'UPCOMING' ? 'secondary' : 'outline';
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <>
      <Card
        onClick={() => navigate(`/contest-detail/${contest.id}`)}
        className="group max-w-sm cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md"
      >
        <div className="h-48 w-full overflow-hidden bg-muted">
          <img
            src={contest.image}
            alt={contest.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <CardContent className="p-4">
          <div className="mb-2">{statusBadge()}</div>

          <h3 className="line-clamp-1 text-base font-semibold text-foreground">
            {contest.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">Date:</span> {contest.date}
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" /> {contest.category}
          </p>
          <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Description:</span> {contest.description}
          </p>
        </CardContent>

        <CardFooter className="gap-2 p-4 pt-0">
          <Button
            onClick={handleJoinClick}
            variant={isRegistered ? 'outline' : 'default'}
            className={
              isRegistered
                ? undefined
                : 'bg-warning text-warning-foreground hover:bg-warning/90'
            }
            aria-label={
              isRegistered
                ? `You are registered for ${contest.name}`
                : `Join ${contest.name}`
            }
          >
            <Flag className="mr-2 h-4 w-4" />
            {isRegistered ? 'Registered' : 'Join'}
          </Button>
          <Button
            variant="outline"
            onClick={handleViewSubmission}
            className="border-warning text-warning hover:bg-warning/10"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Submission
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={openRegDialog} onOpenChange={setOpenRegDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Already Registered</DialogTitle>
            <DialogDescription>
              You have already registered for this competition. Cancel?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRegDialog(false)}>
              No
            </Button>
            <Button
              autoFocus
              onClick={handleCancelRegistration}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openTeamDialog} onOpenChange={setOpenTeamDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Select Your Team</DialogTitle>
          </DialogHeader>
          {teamsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-warning" />
            </div>
          ) : createdTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have no teams. Please create one first.
            </p>
          ) : (
            <ul className="space-y-3">
              {createdTeams.map((team) => (
                <li
                  key={team.id}
                  className="flex flex-col gap-2 rounded-md border p-3"
                >
                  <p className="font-medium text-foreground">{team.name}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-warning text-warning hover:bg-warning/10"
                      onClick={async () => {
                        const registered = await checkTeamStatus(team.id);
                        if (registered) {
                          toast.info('Team already registered.');
                        } else {
                          registerTeam(team.id);
                        }
                      }}
                    >
                      Register
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-warning text-warning hover:bg-warning/10"
                      onClick={async () => {
                        const registered = await checkTeamStatus(team.id);
                        if (!registered) {
                          toast.warning('Team not registered yet.');
                        } else {
                          cancelTeamRegistration(team.id);
                        }
                      }}
                    >
                      Cancel Reg
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTeamDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ContestCard;
