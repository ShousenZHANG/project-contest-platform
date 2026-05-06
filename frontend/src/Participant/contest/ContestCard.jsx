/**
 * ContestCard.jsx
 *
 * Participant contest card. Migrated from MUI to shadcn/ui.
 *
 * Role: Participant
 * Developer: Zhaoyi Yang, Beiqi Dai
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Flag, Eye, Tag, Play, Clock, Lock, Loader2 } from 'lucide-react';
import apiClient from '../../api/apiClient';
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

  const checkTeamStatus = async (teamId) => {
    try {
      const res = await apiClient.get(
        `/registrations/teams/${contest.id}/${teamId}/status`
      );
      return res.data === true || res.data === 'true';
    } catch (err) {
      return false;
    }
  };

  const fetchCreatedTeams = async () => {
    const userId = AuthTokenManager.getUserId();
    setTeamsLoading(true);
    try {
      const res = await apiClient.get(
        `/teams/public/created?userId=${userId}&page=1&size=100`
      );
      const teams = res.data.data || [];
      setCreatedTeams(teams);
      return teams;
    } catch (err) {
      toast.error('Failed to load your teams.');
    } finally {
      setTeamsLoading(false);
    }
    return [];
  };

  const registerTeam = async (teamId) => {
    try {
      await apiClient.post(`/registrations/teams/${contest.id}/${teamId}`);
      toast.success('Team registered successfully!');
    } catch (err) {
      toast.error('Team registration failed.');
    }
  };

  const cancelTeamRegistration = async (teamId) => {
    try {
      await apiClient.delete(`/registrations/teams/${contest.id}/${teamId}`);
      toast.success('Team registration cancelled!');
    } catch (err) {
      toast.error('Team cancellation failed.');
    } finally {
      setOpenTeamDialog(false);
    }
  };

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

    try {
      await apiClient.post(`/registrations/${contest.id}`);
      toast.success('Registration successful!');
    } catch (err) {
      const text =
        typeof err.response?.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response?.data || '');
      if (text.includes('already registered')) setOpenRegDialog(true);
      else toast.error('Registration failed.');
    }
  };

  const handleCancelRegistration = async () => {
    try {
      await apiClient.delete(`/registrations/${contest.id}`);
      toast.success('Cancelled successfully!');
      setOpenRegDialog(false);
    } catch (err) {
      toast.error('Cancellation failed.');
    }
  };

  const handleViewSubmission = async (e) => {
    e.stopPropagation();

    if (!contest?.id) {
      toast.error('Invalid contest ID.');
      return;
    }

    try {
      const res = await apiClient.get(
        `/submissions/public/approved?competitionId=${contest.id}`
      );
      const submissions = res.data.data || [];
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
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            <Flag className="mr-2 h-4 w-4" />
            Join
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
