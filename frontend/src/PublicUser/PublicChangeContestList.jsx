/**
 * PublicChangeContestList.jsx
 *
 * Single contest row inside PublicChangeContestTable. Provides Vote/Join
 * buttons that prompt the user to log in. Migrated from MUI to shadcn/ui +
 * Tailwind.
 *
 * Role: Public User
 * Developer: Beiqi Dai (migrated)
 */
import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusDotColor = (status = "") => {
  const s = status.toLowerCase();
  if (s.includes("upcoming")) return "bg-amber-400";
  if (s.includes("ongoing") || s.includes("active") || s.includes("open"))
    return "bg-emerald-500";
  if (s.includes("end") || s.includes("closed") || s.includes("complete"))
    return "bg-slate-400";
  return "bg-primary";
};

function PublicChangeContestList({ contest, onClick }) {
  const handleRowClick = (e) => {
    if (onClick) onClick(e);
  };

  const handleLoginReminder = (e) => {
    e.stopPropagation();
    toast.warning("Please log in first!");
  };

  if (!contest) return null;

  return (
    <tr
      className="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/40 last:border-b-0"
      onClick={handleRowClick}
    >
      <td className="px-4 py-3 font-medium text-foreground">{contest.title}</td>
      <td className="px-4 py-3 text-muted-foreground">{contest.category}</td>
      <td className="px-4 py-3 text-muted-foreground">{contest.date}</td>
      <td className="px-4 py-3 text-foreground">
        <span className="inline-flex items-center gap-2">
          <span
            className={cn("inline-block h-2.5 w-2.5 rounded-full", statusDotColor(contest.status))}
          />
          {contest.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleLoginReminder}
          >
            Vote
          </Button>
          <Button
            size="sm"
            onClick={handleLoginReminder}
          >
            Join
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default PublicChangeContestList;
