/**
 * PublicContestDetail.jsx
 *
 * Public contest detail page. Migrated from MUI to shadcn/ui.
 *
 * Role: Public User
 * Developer: Beiqi Dai, Zhaoyi Yang
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../Homepages/Navbar";
import Footer from "../Homepages/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import defaultImage from "./1.jpg";
import apiClient from "../api/apiClient";

function PublicContestDetail() {
  const { id: contestId } = useParams();
  const navigate = useNavigate();
  const [contestDetail, setContestDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchContestDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/competitions/${contestId}`);
        setContestDetail(response.data);
      } catch (err) {
        setError("Failed to load contest details.");
      } finally {
        setLoading(false);
      }
    };

    fetchContestDetail();
  }, [contestId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-muted/20 px-4 py-10">
          <div className="mx-auto max-w-6xl space-y-4">
            <Skeleton className="h-10 w-32" />
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-96 md:col-span-1" />
              <Skeleton className="h-96 md:col-span-2" />
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !contestDetail) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-muted/20 px-4 py-20 text-center">
          <p className="text-lg font-medium text-destructive">
            {error || "No contest details available."}
          </p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <Footer />
      </>
    );
  }

  const images = contestDetail.imageUrls?.length ? contestDetail.imageUrls : [defaultImage];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>

          <div className="grid gap-6 md:grid-cols-5">
            {/* Image carousel */}
            <Card className="relative overflow-hidden md:col-span-2">
              <div
                className="h-96 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${images[currentImageIndex]})` }}
              />
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur hover:bg-white"
                    onClick={() =>
                      setCurrentImageIndex((prev) =>
                        prev === 0 ? images.length - 1 : prev - 1
                      )
                    }
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur hover:bg-white"
                    onClick={() =>
                      setCurrentImageIndex((prev) =>
                        prev === images.length - 1 ? 0 : prev + 1
                      )
                    }
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </Card>

            {/* Content */}
            <div className="md:col-span-3 space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{contestDetail.name}</h1>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {contestDetail.description}
                </p>
                <div className="mt-4">
                  <Button
                    onClick={() => navigate(`/work-list?competitionId=${contestId}`)}
                  >
                    View Related Works
                  </Button>
                </div>
              </div>

              <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                <CardContent className="space-y-3 p-6">
                  <h2 className="text-xl font-semibold">Competition Details</h2>
                  <Separator className="bg-primary-foreground/20" />
                  <DetailRow label="Category" value={contestDetail.category} />
                  <DetailRow label="Public" value={contestDetail.isPublic ? "Yes" : "No"} />
                  <DetailRow label="Status" value={<Badge variant="secondary">{contestDetail.status}</Badge>} />
                  <DetailRow
                    label="Start Date"
                    value={new Date(contestDetail.startDate).toLocaleString()}
                  />
                  <DetailRow
                    label="End Date"
                    value={new Date(contestDetail.endDate).toLocaleString()}
                  />
                  <DetailRow
                    label="Allowed Submission Types"
                    value={contestDetail.allowedSubmissionTypes?.join(", ")}
                  />
                  <DetailRow label="Participation Type" value={contestDetail.participationType} />
                  <DetailRow
                    label="Scoring Criteria"
                    value={contestDetail.scoringCriteria?.join(", ")}
                  />

                  {contestDetail.introVideoUrl && (
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-semibold">Intro Video</h3>
                      <video
                        src={contestDetail.introVideoUrl}
                        controls
                        className="w-full rounded-lg bg-black"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-primary-foreground/15 pb-2 text-sm">
      <span className="font-medium">{label}:</span>
      <span className="text-right text-primary-foreground/90">{value || "N/A"}</span>
    </div>
  );
}

export default PublicContestDetail;
