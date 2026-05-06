/**
 * PubContestCard.jsx
 *
 * Vibrant contest card for public listing. Provides Vote / Join actions that
 * call the backend (and prompt login when unauthenticated). Migrated from MUI
 * to shadcn/ui + Tailwind.
 *
 * Developer: Beiqi Dai (migrated)
 */
import React from "react";
import { Heart, Flag, ThumbsUp, Tag } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import apiClient from "../api/apiClient";
import AuthTokenManager from '@/auth/authTokenManager';


function ContestCard({ contest, onCardClick, onLoginRequest }) {
  const handleCardClick = () => {
    onCardClick && onCardClick(contest);
  };

  const handleVoteClick = async (e) => {
    e.stopPropagation();
    try {
      const token = AuthTokenManager.getToken();
      if (!token) {
        toast.warning("Please log in first!");
        return;
      }
      await apiClient.post(`/api/contest/${contest.id}/votes`);
      toast.success("Vote success!");
    } catch (error) {
      const errData = error.response?.data;
      if (errData?.error === "Already voted") {
        toast.info("You have already voted!");
      } else {
        toast.error("Vote failed, network or server error.");
      }
    }
  };

  const handleJoinClick = async (e) => {
    e.stopPropagation();

    const token = null;

    if (!token) {
      if (onLoginRequest) {
        onLoginRequest();
      } else {
        toast.warning("Please log in first!");
      }
      return;
    }

    try {
      await apiClient.post(`/api/contest/${contest.id}/join`);
      toast.success("Join success!");
    } catch (error) {
      const errData = error.response?.data;
      if (errData?.error === "Already JOIN!") {
        toast.info("You have already joined!");
      } else {
        toast.error("Join failed, network or server error.");
      }
    }
  };

  return (
    <Card
      onClick={handleCardClick}
      className="group max-w-sm cursor-pointer overflow-hidden border-border/60 transition-all hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <img
          src={contest.image}
          alt={contest.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      <CardContent className="space-y-2 p-5">
        <h3 className="line-clamp-1 text-lg font-semibold text-foreground">
          {contest.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Organizer:</span>{" "}
          {contest.organizer}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Date:</span> {contest.date}
        </p>
        <Badge variant="secondary" className="mt-1 inline-flex items-center gap-1">
          <Tag className="h-3 w-3" />
          {contest.category}
        </Badge>
        <p className="line-clamp-2 pt-1 text-sm text-muted-foreground">
          {contest.description}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 px-5 pb-5 pt-0">
        <button
          type="button"
          onClick={handleVoteClick}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <ThumbsUp className="h-4 w-4" />
          {contest.votes ?? 0}
        </button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleVoteClick}>
            <Heart className="mr-1.5 h-4 w-4" />
            Vote
          </Button>
          <Button size="sm" onClick={handleJoinClick}>
            <Flag className="mr-1.5 h-4 w-4" />
            Join
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default ContestCard;
