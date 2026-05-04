/**
 * @file TeamPage.jsx
 * @description
 * Team management landing page. Migrated from MUI to shadcn/ui + Tailwind.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import apiClient from '@/api/apiClient';
import ParticipantTeam from './ParticipantTeam';
import MyTeamsDialog from './MyTeamsDialog';

function TeamPage() {
  const [userData, setUserData] = useState(null);
  const [viewMode] = useState('explore');
  const [myDialogOpen, setMyDialogOpen] = useState(false);
  const [myTeams, setMyTeams] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/users/profile');
        setUserData(res.data);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch user data:', error);
      }
    })();
  }, []);

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
          onUpdate={() => window.location.reload()}
        />
      </div>
    </div>
  );
}

export default TeamPage;
