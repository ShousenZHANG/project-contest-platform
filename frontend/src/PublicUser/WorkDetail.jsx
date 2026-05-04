/**
 * WorkDetail.jsx
 *
 * Detail card for a single work shown in a modal-like overlay.
 * Migrated from MUI to shadcn/ui + Tailwind.
 *
 * Role: Public User
 * Developer: Beiqi Dai (migrated)
 */
import React from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function WorksDetail({ work, onClose }) {
  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="icon"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 z-10 h-8 w-8 rounded-md bg-foreground/80 text-background hover:bg-foreground"
      >
        <X className="h-4 w-4" />
      </Button>

      <Card className="overflow-hidden border-border/60 shadow-lg">
        <div className="h-72 w-full overflow-hidden bg-muted">
          <img
            src={work.image}
            alt={work.title}
            className="h-full w-full object-cover"
          />
        </div>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {work.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Producer:</span>{" "}
            {work.producer}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Work description:</span>{" "}
            {work.description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default WorksDetail;
