/**
 * ContestDetail.jsx
 *
 * Participant contest detail view. Migrated from MUI to shadcn/ui.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import defaultImage from './1.jpg';

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-white/20 pb-1.5 text-sm">
      <span className="font-medium text-white/90">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function ContestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contestDetail, setContestDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchContestDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/competitions/${id}`);
      setContestDetail(res.data);
    } catch (err) {
      setError('Failed to load contest details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContestDetail();
  }, [fetchContestDetail]);

  const images = contestDetail?.imageUrls || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4 text-warning hover:bg-warning/10 hover:text-warning"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back To Contest List
      </Button>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-warning" />
        </div>
      ) : contestDetail ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: image gallery */}
          <div className="relative h-96 overflow-hidden rounded-lg bg-warning/40">
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${
                  images.length > 0 ? images[currentImageIndex] : defaultImage
                })`,
              }}
            />
            {images.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white"
                  onClick={() =>
                    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                  }
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white"
                  onClick={() =>
                    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                  }
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Right: content */}
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardContent className="p-5">
                <h1 className="text-2xl font-bold text-foreground">{contestDetail.name}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{contestDetail.description}</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-warning text-warning-foreground">
              <CardContent className="space-y-3 p-5">
                <h2 className="text-lg font-semibold">Competition Details</h2>
                <DetailRow label="Category:" value={contestDetail.category} />
                <DetailRow label="Public:" value={contestDetail.isPublic ? 'Yes' : 'No'} />
                <DetailRow label="Status:" value={contestDetail.status} />
                <DetailRow label="Participation Type" value={contestDetail.participationType} />
                <DetailRow
                  label="Start Date:"
                  value={new Date(contestDetail.startDate).toLocaleString()}
                />
                <DetailRow
                  label="End Date:"
                  value={new Date(contestDetail.endDate).toLocaleString()}
                />
                <DetailRow
                  label="Allowed Submission Types:"
                  value={contestDetail.allowedSubmissionTypes?.join(', ')}
                />

                <div>
                  <p className="text-sm font-medium text-white/90">Scoring Criteria:</p>
                  <div className="mt-1 flex flex-wrap gap-2 pl-2">
                    {contestDetail.scoringCriteria?.length > 0 ? (
                      contestDetail.scoringCriteria.map((c, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-white/20 text-white">
                          {c}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-white/80">No scoring criteria available.</p>
                    )}
                  </div>
                </div>

                {contestDetail.introVideoUrl && (
                  <>
                    <Separator className="bg-white/30" />
                    <div>
                      <p className="mb-2 text-sm font-medium text-white/90">Intro Video:</p>
                      <video
                        src={contestDetail.introVideoUrl}
                        controls
                        className="w-full rounded-md bg-black"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No contest details available.</p>
      )}
    </div>
  );
}

export default ContestDetail;
