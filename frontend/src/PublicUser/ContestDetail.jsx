/**
 * ContestDetail.jsx
 *
 * Public contest detail card shown in a modal-like overlay. Includes a Login
 * modal trigger for unauthenticated users. Migrated from MUI to shadcn/ui +
 * Tailwind.
 *
 * Role: Public User
 * Developer: Beiqi Dai (migrated)
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import LoginModal from "../Homepages/Login";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function ContestDetail({ contest, onClose }) {
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const handleOpenLogin = () => {
    setIsLoginOpen(true);
  };

  const handleCloseLogin = () => {
    setIsLoginOpen(false);
  };

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
            src={contest.image}
            alt={contest.title}
            className="h-full w-full object-cover"
          />
        </div>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {contest.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Organizer:</span>{" "}
            {contest.organizer}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Date:</span> {contest.date}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Category:</span>{" "}
            {contest.category}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {contest.description}
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => navigate("/work-list")}>View Details</Button>
            <Button variant="outline" onClick={handleOpenLogin}>
              Login
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoginOpen && <LoginModal onClose={handleCloseLogin} />}
    </div>
  );
}

export default ContestDetail;
