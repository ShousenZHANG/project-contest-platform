/**
 * ContestCard.jsx
 *
 * Featured contest card. Migrated from MUI to shadcn/ui Card + Tailwind.
 * Behavior preserved: clicking the card fires onCardClick(contest), the Vote
 * button hits POST /interactions/votes/count, and Join hits POST
 * /registrations/{contest.id}. Auth required for both — toast on success/error.
 *
 * Developer: Beiqi Dai (migrated)
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { ThumbsUp, Flag, Tag, Calendar, User } from 'lucide-react';

import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import AuthTokenManager from '@/auth/authTokenManager';


function ContestCard({ contest, onCardClick }) {
  const [voteCount, setVoteCount] = useState(contest.votes ?? 0);

  const handleCardClick = () => {
    if (typeof onCardClick === 'function') onCardClick(contest);
  };

  const handleVoteClick = async (e) => {
    e.stopPropagation();

    const token = AuthTokenManager.getToken();
    if (!token) {
      toast.error('Please log in first');
      return;
    }

    try {
      await apiClient.post(`/interactions/votes/count`, null, {
        params: { submissionId: contest.id },
      });
      setVoteCount((v) => v + 1);
      toast.success('Vote submitted');
    } catch (error) {
      const errMsg =
        error.response?.data?.error || error.response?.data?.message;
      if (errMsg === 'Already voted') {
        toast.error('You have already voted');
      } else {
        toast.error('Voting failed. Please try again.');
      }
    }
  };

  const handleJoinClick = async (e) => {
    e.stopPropagation();

    const token = AuthTokenManager.getToken();
    if (!token) {
      toast.error('Please log in first');
      return;
    }

    try {
      await apiClient.post(`/registrations/${contest.id}`);
      toast.success('Joined successfully');
    } catch (error) {
      const errMsg =
        error.response?.data?.error || error.response?.data?.message;
      if (errMsg === 'Already JOIN!') {
        toast.error('You have already joined');
      } else {
        toast.error('Joining failed. Please try again.');
      }
    }
  };

  return (
    <Card
      onClick={handleCardClick}
      className="group flex flex-col overflow-hidden cursor-pointer border-border/60 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={contest.image}
          alt={contest.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {contest.category && (
          <Badge className="absolute top-3 left-3 bg-background/90 text-foreground hover:bg-background backdrop-blur">
            <Tag className="mr-1 h-3 w-3" />
            {contest.category}
          </Badge>
        )}
      </div>

      <CardContent className="flex-1 p-5 space-y-3">
        <h3 className="text-lg font-semibold tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
          {contest.title}
        </h3>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{contest.organizer}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{contest.date}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {contest.description}
        </p>
      </CardContent>

      <CardFooter className="p-5 pt-0 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleVoteClick}
          className="flex-1"
        >
          <ThumbsUp className="h-4 w-4" />
          <span>Vote</span>
          <span className="ml-auto text-xs font-medium text-muted-foreground">
            {voteCount}
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleJoinClick}
          className="flex-1"
        >
          <Flag className="h-4 w-4" />
          Join
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ContestCard;
