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

import React, { useEffect, useState } from 'react';
import { Users, Plus, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/api/apiClient';
import TeamCreateDialog from './TeamCreateDialog';
import MyTeamsDialog from './MyTeamsDialog';
import TeamList from './TeamList';
import AuthTokenManager from '@/auth/authTokenManager';

import {
  fetchJoinedTeams,
  fetchTeams,
  fetchMyTeams,
  createTeam,
  joinTeam,
  leaveTeam,
  deleteTeam,
} from './teamApi';

function ParticipantTeam() {
  const [userData, setUserData] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [teams, setTeams] = useState([]);
  const [joinedTeams, setJoinedTeams] = useState(new Set());
  const [myTeams, setMyTeams] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('asc');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/users/profile');
        const data = res.data;
        data.userId = AuthTokenManager.getUserId();
        setUserData(data);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch user data:', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (userData?.userId) {
      fetchJoinedTeams(userData, setJoinedTeams);
      fetchTeams({ page, keyword, sortBy, order }, setTeams, setPages);
    }
  }, [userData, page, keyword, sortBy, order]);

  if (!userData) return null;

  const handleUpdateMyTeams = () => {
    fetchMyTeams(userData, setMyTeams);
    fetchTeams({ page, keyword, sortBy, order }, setTeams, setPages);
  };

  // Adapter — teamApi.joinTeam/leaveTeam call (setMsg, setSuccess, setOpen)
  // separately. We collect the latest msg/severity and fire one toast on open.
  const makeStatusAdapter = () => {
    const state = { msg: '', ok: true };
    return {
      setMsg: (msg) => {
        state.msg = msg;
      },
      setOk: (ok) => {
        state.ok = ok;
      },
      fire: () => {
        if (state.ok) toast.success(state.msg);
        else toast.error(state.msg);
      },
    };
  };

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
            onClick={() => {
              setViewDialogOpen(true);
              fetchMyTeams(userData, setMyTeams);
            }}
          >
            <FolderKanban className="h-4 w-4" />
            View My Teams
          </Button>
        </div>

        <p className="rounded-md bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
          Browse and join public teams below
        </p>

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
          onJoin={(team) => {
            const a = makeStatusAdapter();
            joinTeam(team, userData, setJoinedTeams, a.setMsg, a.setOk, a.fire);
          }}
          onLeave={(id) => {
            const a = makeStatusAdapter();
            leaveTeam(id, userData, setJoinedTeams, a.setMsg, a.setOk, a.fire);
          }}
        />

        <TeamCreateDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onCreate={(name, desc) =>
            createTeam(name, desc, userData, {
              onSuccess: () => {
                toast.success('Team created!');
                setDialogOpen(false);
                fetchJoinedTeams(userData, setJoinedTeams);
                fetchTeams(
                  { page: 1, keyword, sortBy, order },
                  setTeams,
                  setPages
                );
              },
              onError: (msg) => toast.error(msg),
            })
          }
        />

        <MyTeamsDialog
          open={viewDialogOpen}
          myTeams={myTeams}
          userData={userData}
          onClose={() => setViewDialogOpen(false)}
          onUpdate={handleUpdateMyTeams}
          onDelete={(id) =>
            deleteTeam(id, userData, {
              onSuccess: () => {
                toast.success('Team deleted');
                setMyTeams((prev) => prev.filter((t) => t.id !== id));
                setJoinedTeams((prev) => {
                  const copy = new Set(prev);
                  copy.delete(id);
                  return copy;
                });
                fetchTeams(
                  { page, keyword, sortBy, order },
                  setTeams,
                  setPages
                );
              },
              onError: (msg) => toast.error(msg),
            })
          }
        />
      </CardContent>
    </Card>
  );
}

export default ParticipantTeam;
