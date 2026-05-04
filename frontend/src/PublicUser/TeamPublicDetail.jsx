/**
 * TeamPublicDetail.jsx
 *
 * Public-facing detail view for a team's submission within a competition.
 * Migrated from MUI to shadcn/ui + Tailwind.
 *
 * Role: Public User
 * Developer: Ziqi Yi (migrated)
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, FileText, Pin, Paperclip, Award } from "lucide-react";
import Navbar from "../Homepages/Navbar";
import Footer from "../Homepages/Footer";
import apiClient from "../api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function TeamPublicDetail() {
  const { competitionId, teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { teamName, teamDescription } = location.state || {};
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await apiClient.get(`/submissions/public/teams/${competitionId}/${teamId}`);
        setSubmission(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "No submission found for this team.");
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [competitionId, teamId]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Team List
          </Button>

          <Card className="border-border/60 shadow-lg">
            <CardHeader className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight">
                {teamName || "Unnamed Team"}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {teamDescription || "No description provided."}
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <p className="py-12 text-center text-destructive">
                  No submission found for this team.
                </p>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Pin className="h-4 w-4 text-primary" />
                      Submission Title
                    </div>
                    <p className="mt-1 text-base text-muted-foreground">
                      {submission.title || "No title"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      Description
                    </div>
                    <p className="mt-1 text-base text-muted-foreground">
                      {submission.description || "No description"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Paperclip className="h-4 w-4 text-primary" />
                      File
                    </div>
                    {submission.fileUrl ? (
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                      >
                        {submission.fileName || "Download File"}
                      </a>
                    ) : (
                      <p className="mt-1 text-base text-muted-foreground">
                        No file submitted.
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Review Status
                      </p>
                      <div className="mt-2">
                        <Badge variant="secondary">{submission.reviewStatus || "—"}</Badge>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Total Score
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Award className="h-5 w-5 text-amber-500" />
                        {submission.totalScore ?? "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default TeamPublicDetail;
