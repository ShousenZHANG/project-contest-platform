/**
 * ContestCard.jsx
 *
 * Featured contest card. shadcn/ui Card + Tailwind. When a contest has no
 * uploaded image, a deterministic brand-family gradient cover is rendered
 * instead of relying on fragile external image URLs.
 *
 * Behavior preserved: clicking the card fires onCardClick(contest), Vote hits
 * POST /interactions/votes/count, Join hits POST /registrations/{id}. Auth
 * required for both — toast on success/error.
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { ThumbsUp, Flag, Tag, Calendar, User } from 'lucide-react';

import apiClient from '../api/apiClient';
import { coverGradient, initials } from '../lib/coverGradient';
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
        {contest.image ? (
          <img
            src={contest.image}
            alt={contest.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden="true"
            className="relative h-full w-full transition-transform duration-500 group-hover:scale-105"
            style={{ background: coverGradient(contest.title) }}
          >
            <div className="absolute inset-0 bg-grid opacity-20 mix-blend-overlay" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold tracking-tight text-white/90 drop-shadow-sm">
                {initials(contest.title)}
              </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          </div>
        )}
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
          aria-label={`Vote for ${contest.title} — ${voteCount} votes so far`}
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
          aria-label={`Join ${contest.title}`}
        >
          <Flag className="h-4 w-4" />
          Join
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ContestCard;
