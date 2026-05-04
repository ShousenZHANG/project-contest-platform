/**
 * ReRating.jsx
 *
 * Allows judges to update a previous rating. Migrated from MUI to shadcn/ui.
 *
 * Role: Judge
 * Developer: Zhaoyi Yang
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';

function ReRating() {
  const { competitionId, submissionId } = useParams();
  const navigate = useNavigate();

  const [scoringCriteria, setScoringCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [weights, setWeights] = useState({});
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJudgingDetails = async () => {
      try {
        const res = await apiClient.get(`/judges/${submissionId}/detail`);
        const data = res.data;
        const newScores = {};
        const newWeights = {};
        data.scores.forEach((s) => {
          newScores[s.criterion] = s.score;
          newWeights[s.criterion] = s.weight;
        });
        setScoringCriteria(data.scores.map((s) => s.criterion));
        setScores(newScores);
        setWeights(newWeights);
        setFeedback(data.judgeComments || '');
      } catch (err) {
        // Failed to fetch judging detail
      } finally {
        setLoading(false);
      }
    };

    fetchJudgingDetails();
  }, [submissionId]);

  const handleSliderChange = (criterion, value) => {
    setScores((prev) => ({ ...prev, [criterion]: value }));
  };

  const handleSubmit = async () => {
    const scoreArray = scoringCriteria.map((criterion) => ({
      criterion,
      score: scores[criterion],
      weight: weights[criterion],
    }));

    try {
      await apiClient.put(`/judges/${submissionId}`, {
        competitionId,
        submissionId,
        judgeComments: feedback,
        scores: scoreArray,
      });
      toast.success('Rating updated successfully');
      setTimeout(() => navigate(`/JudgeSubmissions/${competitionId}`), 1200);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error updating rating';
      toast.error(errorMsg);
    }
  };

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
