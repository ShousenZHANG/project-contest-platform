/**
 * ReRating.jsx
 *
 * Allows judges to update a previous rating. Migrated from MUI to shadcn/ui.
 *
 * Role: Judge
 * Developer: Zhaoyi Yang
 */

import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { judgeService } from '../services/judgeService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap, toMessage } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';

function ReRating() {
  const { competitionId, submissionId } = useParams();
  const navigate = useNavigate();

  const [scores, setScores] = useState({});
  const [weights, setWeights] = useState({});
  const [feedback, setFeedback] = useState('');
  const queryClient = useQueryClient();

  const { data: detail, isPending: loading } = useQuery({
    queryKey: [...queryKeys.judges.all, 'detail', submissionId],
    queryFn: () => unwrap(judgeService.getSubmissionDetail(submissionId)),
    enabled: Boolean(submissionId),
    staleTime: staleTime.medium,
  });

  const scoringCriteria = ((detail && detail.scores) || []).map((s) => s.criterion);

  // Seed the sliders and feedback from the existing review once, then leave
  // them alone: a background refetch must not discard the judge's revisions.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !detail || !detail.scores) return;
    seeded.current = true;

    const nextScores = {};
    const nextWeights = {};
    detail.scores.forEach((s) => {
      nextScores[s.criterion] = s.score;
      nextWeights[s.criterion] = s.weight;
    });
    setScores(nextScores);
    setWeights(nextWeights);
    setFeedback(detail.judgeComments || '');
  }, [detail]);

  const handleSliderChange = (criterion, value) => {
    setScores((prev) => ({ ...prev, [criterion]: value }));
  };

  const updateRating = useMutation({
    mutationFn: (body) => unwrap(judgeService.updateScore(submissionId, body)),
    onSuccess: () => {
      toast.success('Rating updated successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.judges.all });
      setTimeout(() => navigate(`/JudgeSubmissions/${competitionId}`), 1200);
    },
    onError: (error) => toast.error(toMessage(error)),
  });

  const handleSubmit = () =>
    updateRating.mutate({
      competitionId,
      submissionId,
      judgeComments: feedback,
      scores: scoringCriteria.map((criterion) => ({
        criterion,
        score: scores[criterion],
        weight: weights[criterion],
      })),
    });

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl font-semibold text-foreground">Update Your Rating</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
              <div className="md:col-span-7 space-y-6">
                {scoringCriteria.map((criterion, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{criterion}</Label>
                      <span className="text-sm text-muted-foreground">
                        {Number(scores[criterion]).toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.1}
                      value={scores[criterion]}
                      onChange={(e) => handleSliderChange(criterion, parseFloat(e.target.value))}
                      className="w-full accent-warning"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.0</span>
                      <span>10.0</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="md:col-span-5 flex flex-col gap-3">
                <Label className="text-sm font-medium">Feedback</Label>
                <textarea
                  rows={10}
                  placeholder="Write your feedback here..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button onClick={handleSubmit} className="self-end bg-warning text-warning-foreground hover:bg-warning/90">
                  Update Rating
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ReRating;
