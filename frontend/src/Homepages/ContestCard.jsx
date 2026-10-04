import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import { coverGradient, initials } from '../lib/coverGradient';
import { Card, CardContent, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

/** A real competition has one primary action: read its requirements. */
export default function ContestCard({ contest }) {
  return (
    <Card className="group flex h-full min-w-0 flex-col overflow-hidden border-border/60 motion-card">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {contest.image ? (
          <img src={contest.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full items-center justify-center"
            style={{ background: coverGradient(contest.title) }}
          >
            <span className="text-5xl font-bold text-white/90">{initials(contest.title)}</span>
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute left-3 top-3 max-w-[90%] bg-background text-foreground"
        >
          {contest.category || 'Competition'}
        </Badge>
      </div>
      <CardContent className="flex-1 space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={contest.status === 'ONGOING' ? 'success' : 'outline'}>
            {contest.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {contest.participationType === 'TEAM' ? 'Team entry' : 'Individual entry'}
          </span>
        </div>
        <h3 className="break-words text-lg font-semibold">
          <Link
            className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            to={`/publiccontest-detail/${contest.id}`}
          >
            {contest.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{contest.description}</p>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Calendar aria-hidden="true" className="h-4 w-4 shrink-0" />
          {contest.date}
        </p>
      </CardContent>
      <CardFooter className="p-5 pt-0">
        <Button asChild variant="outline" className="w-full min-h-11">
          <Link
            to={`/publiccontest-detail/${contest.id}`}
            aria-label={`View details for ${contest.title}`}
          >
            View details
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
