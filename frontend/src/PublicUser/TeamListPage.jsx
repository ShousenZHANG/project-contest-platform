/**
 * TeamListPage.jsx
 *
 * Public-facing list of teams registered for a contest.
 * Migrated from MUI to shadcn/ui + Tailwind.
 *
 * Role: Public User
 * Developer: Ziqi Yi (migrated)
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import Navbar from "../Homepages/Navbar";
import Footer from "../Homepages/Footer";
import apiClient from "../api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EmptyState from "@/shared/components/EmptyState";

function TeamListPage() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await apiClient.get(
          `/registrations/public/${contestId}/teams`,
          { params: { page: 1, size: 100 } }
        );
        setTeams(response.data.data || []);
      } catch (err) {
        setError(err.message || "Failed to fetch team data");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [contestId]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contest
          </Button>

          <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">
            Registered Teams
          </h1>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="py-12 text-center text-destructive">{error}</p>
          ) : teams.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No teams registered yet."
              description="Teams will appear here once they sign up for the contest."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team, index) => (
                <Card
                  key={team.id || index}
                  onClick={() =>
                    navigate(`/public-team-detail/${contestId}/${team.id}`, {
                      state: {
                        teamName: team.name,
                        teamDescription: team.description,
                      },
                    })
                  }
                  className="group cursor-pointer border-border/60 transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <CardContent className="flex items-center gap-3 p-5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                      <Users className="h-5 w-5" />
                    </span>
                    <h3 className="line-clamp-2 text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                      {team.name || "Unnamed Team"}
                    </h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default TeamListPage;
