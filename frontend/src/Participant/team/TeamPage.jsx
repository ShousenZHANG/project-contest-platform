/**
 * @file TeamPage.jsx
 * @description
 * Team management landing page. Migrated from MUI to shadcn/ui + Tailwind.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { userService } from '@/services/userService';
import { queryKeys, staleTime } from '@/api/queryKeys';
import { unwrap } from '@/api/queryFn';
import ParticipantTeam from './ParticipantTeam';
import MyTeamsDialog from './MyTeamsDialog';

function TeamPage() {
  const [viewMode] = useState('explore');
  const [myDialogOpen, setMyDialogOpen] = useState(false);
  const [myTeams, setMyTeams] = useState([]);

  const queryClient = useQueryClient();

  // Same cache entry ParticipantTeam reads, so the profile is fetched once for
  // the pair rather than once each.
  const { data: userData = null } = useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: () => unwrap(userService.getProfile()),
    staleTime: staleTime.long,
  });

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Team Management
          </h1>
        </header>

        {userData && viewMode === 'explore' && (
          <ParticipantTeam
            userData={userData}
            onOpenMyTeams={(list) => {
              setMyTeams(list);
              setMyDialogOpen(true);
            }}
          />
        )}

        <MyTeamsDialog
          open={myDialogOpen}
          onClose={() => setMyDialogOpen(false)}
          myTeams={myTeams}
          userData={userData}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })}
        />
      </div>
    </div>
  );
}

export default TeamPage;
