/**
 * @file ParticipantTeam.jsx
 * @description
 * Participant team management area: browse public teams, create team,
 * view My Teams. Migrated from MUI to shadcn/ui + Tailwind. Sonner toasts
 * replace Snackbar/Alert.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { userService } from '@/services/userService';
import { teamService } from '@/services/teamService';
import { queryKeys, staleTime } from '@/api/queryKeys';
import { unwrap, toMessage } from '@/api/queryFn';
import TeamCreateDialog from './TeamCreateDialog';
import MyTeamsDialog from './MyTeamsDialog';
import TeamList from './TeamList';
import AuthTokenManager from '@/auth/authTokenManager';

const MY_TEAMS_PARAMS = { page: 1, size: 1000 };

function ParticipantTeam() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('asc');

  const queryClient = useQueryClient();

  // Shares a cache entry with TeamPage, which used to issue this same request
  // separately.
  const { data: profile } = useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: () => unwrap(userService.getProfile()),
    staleTime: staleTime.long,
  });

  const userData = profile ? { ...profile, userId: AuthTokenManager.getUserId() } : null;

  const listParams = { page, size: 5, sortBy, order, keyword };
  const listKey = queryKeys.teams.list(listParams);
  const myTeamsKey = queryKeys.teams.myJoined(MY_TEAMS_PARAMS);
  const signedIn = Boolean(userData && userData.userId);

  const { data: listPage, isPending: teamsPending, error: teamsError } = useQuery({
    queryKey: listKey,
    queryFn: () => unwrap(teamService.getAll(listParams)),
    enabled: signedIn,
    staleTime: staleTime.short,
  });

  const teams = (listPage && listPage.data) || [];
  const pages = (listPage && listPage.pages) || 1;

  const { data: myTeams = [] } = useQuery({
    queryKey: myTeamsKey,
    queryFn: () => unwrap(teamService.getMyJoined(MY_TEAMS_PARAMS)),
    select: (payload) => (payload && payload.data) || [],
    enabled: signedIn,
    staleTime: staleTime.short,
  });

  // Membership is derived from the same response instead of a second request.
  // The old code called /teams/my-joined twice for exactly this.
  const joinedTeams = new Set(myTeams.map((t) => t.id));

  const invalidateTeams = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });

  /** Optimistically add or drop a team from the my-joined list. */
  const patchMembership = (team, joining) =>
    queryClient.setQueryData(myTeamsKey, (current) => {
      const rows = (current && current.data) || [];
      const next = joining
        ? rows.filter((t) => t.id !== team.id).concat(team)
        : rows.filter((t) => t.id !== team.id);
      return current ? { ...current, data: next } : current;
    });

  const joinTeam = useMutation({
    mutationFn: (team) => {
      if (team.createdBy === (userData && userData.userId)) {
        throw new Error('You are the creator');
      }
      return unwrap(teamService.join(team.id));
    },
    onMutate: async (team) => {
      await queryClient.cancelQueries({ queryKey: myTeamsKey });
      const previous = queryClient.getQueryData(myTeamsKey);
      patchMembership(team, true);
      return { previous };
    },
    onError: (error, team, context) => {
      // A 409 means the membership already existed, so the optimistic state was
      // right after all. Keep it and say so.
      if (error && error.response && error.response.status === 409) {
        toast.success('Already a member');
        return;
      }
      if (context && context.previous !== undefined) {
        queryClient.setQueryData(myTeamsKey, context.previous);
      }
      toast.error('Join failed: ' + toMessage(error));
    },
    onSuccess: () => toast.success('Successfully joined'),
    onSettled: invalidateTeams,
  });

  const leaveTeam = useMutation({
    mutationFn: (teamId) => unwrap(teamService.leave(teamId)),
    onMutate: async (teamId) => {
      await queryClient.cancelQueries({ queryKey: myTeamsKey });
      const previous = queryClient.getQueryData(myTeamsKey);
      patchMembership({ id: teamId }, false);
      return { previous };
    },
    onError: (error, _teamId, context) => {
      if (context && context.previous !== undefined) {
        queryClient.setQueryData(myTeamsKey, context.previous);
      }
      const status = error && error.response && error.response.status;
      const reason = status === 403 ? 'Team leader cannot leave' : toMessage(error);
      toast.error('Leave failed: ' + reason);
    },
    onSuccess: () => toast.success('Left successfully'),
    onSettled: invalidateTeams,
  });

  const createTeam = useMutation({
    mutationFn: ({ name, description }) =>
      unwrap(teamService.create({ name, description })),
    onSuccess: () => {
      toast.success('Team created!');
      setDialogOpen(false);
      setPage(1);
      invalidateTeams();
    },
    onError: (error) => toast.error(toMessage(error)),
  });

  const deleteTeam = useMutation({
    mutationFn: (teamId) => unwrap(teamService.delete(teamId)),
    onSuccess: () => {
      toast.success('Team deleted');
      invalidateTeams();
    },
    onError: (error) => {
      const status = error && error.response && error.response.status;
      if (status === 403) toast.error('You are not authorized to delete this team.');
      else if (status === 404) toast.error('Team not found. It may have already been deleted.');
      else toast.error(toMessage(error));
    },
  });

  if (!userData) return null;

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Teams
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
          <Button
            variant="outline"
            onClick={() => setViewDialogOpen(true)}
          >
            <FolderKanban className="h-4 w-4" />
            View My Teams
          </Button>
        </div>

        <p className="rounded-md bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
          Browse and join public teams below
        </p>

        {teamsPending && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading public teams...
          </p>
        )}
        {!teamsPending && teamsError && (
          <p role="alert" className="py-6 text-center text-sm text-destructive">
            {toMessage(teamsError)}
          </p>
        )}
        <TeamList
          teams={teams}
          joinedTeams={joinedTeams}
          page={page}
          pages={pages}
          keyword={keyword}
          sortBy={sortBy}
          order={order}
          setPage={setPage}
          setKeyword={setKeyword}
          setSortBy={setSortBy}
          setOrder={setOrder}
          onJoin={(team) => joinTeam.mutate(team)}
          onLeave={(id) => leaveTeam.mutate(id)}
        />

        <TeamCreateDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onCreate={(name, description) => createTeam.mutate({ name, description })}
        />

        <MyTeamsDialog
          open={viewDialogOpen}
          myTeams={myTeams}
          userData={userData}
          onClose={() => setViewDialogOpen(false)}
          onUpdate={invalidateTeams}
          onDelete={(id) => deleteTeam.mutate(id)}
        />
      </CardContent>
    </Card>
  );
}

export default ParticipantTeam;
