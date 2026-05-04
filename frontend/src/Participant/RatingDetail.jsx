/**
 * RatingDetail.jsx
 *
 * Allows judges to rate submissions. Migrated from MUI to shadcn/ui + native sliders.
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

function RatingDetail() {
  const { competitionId, submissionId } = useParams();
  const navigate = useNavigate();

  const [scoringCriteria, setScoringCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScoringCriteria = async () => {
      try {
        const res = await apiClient.get(`/competitions/${competitionId}`);
        const criteria = res.data.scoringCriteria || [];
        setScoringCriteria(criteria);
        const defaultScores = criteria.reduce((acc, criterion) => {
          acc[criterion] = 5;
          return acc;
        }, {});
        setScores(defaultScores);
      } catch (err) {
        // Failed to fetch competition details
      } finally {
        setLoading(false);
      }
    };

    fetchScoringCriteria();
  }, [competitionId]);

  const handleSliderChange = (criterion, value) => {
    setScores((prev) => ({ ...prev, [criterion]: value }));
  };

  const handleSubmitRating = async () => {
    const ratingsArray = scoringCriteria.map((criterion) => ({
      criterion,
      score: scores[criterion],
      weight: 1.0 / scoringCriteria.length,
    }));

    try {
      await apiClient.post(`/judges/score`, {
        competitionId,
        submissionId,
        judgeComments: feedback,
        scores: ratingsArray,
      });
      toast.success('Rating submitted successfully');
      setTimeout(() => navigate(`/JudgeSubmissions/${competitionId}`), 1200);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error submitting rating';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl font-semibold text-foreground">Rate This Submission</h2>

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
                      className="w-full accent-primary"
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
                <Button onClick={handleSubmitRating} className="self-end">
                  Submit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RatingDetail;
