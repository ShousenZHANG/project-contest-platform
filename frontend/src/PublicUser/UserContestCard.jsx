/**
 * UserContestCard.jsx
 *
 * Vibrant contest card for public browse view. Migrated from MUI to shadcn/ui.
 *
 * Role: Public User
 * Developer: Beiqi Dai
 */

import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Flag, Tag } from "lucide-react";
import { toast } from "sonner";

function ContestCard({ contest, onCardClick }) {
  const handleCardClick = () => {
    onCardClick && onCardClick(contest);
  };

  const handleLoginReminder = (e) => {
    e.stopPropagation();
    toast.warning("Please log in before voting or joining the contest!");
  };

  return (
    <Card
      onClick={handleCardClick}
      className="group max-w-sm overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl border-border/60"
    >
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <img
          src={contest.image}
          alt={contest.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {contest.category && (
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 bg-white/90 text-foreground shadow-sm"
          >
            <Tag className="mr-1 h-3 w-3" />
            {contest.category}
          </Badge>
        )}
      </div>

      <CardContent className="p-5">
        <h3 className="line-clamp-1 text-lg font-semibold text-foreground">
          {contest.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium">Date:</span> {contest.date}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {contest.description}
        </p>
      </CardContent>

      <CardFooter className="flex justify-end gap-2 px-5 pb-5 pt-0">
        <Button variant="outline" size="sm" onClick={handleLoginReminder}>
          <Heart className="mr-1.5 h-4 w-4" />
          Vote
        </Button>
        <Button size="sm" onClick={handleLoginReminder}>
          <Flag className="mr-1.5 h-4 w-4" />
          Join
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ContestCard;
