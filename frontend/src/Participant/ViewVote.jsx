/**
 * ViewVote.jsx
 *
 * Vote count + toggle for a submission. Migrated from MUI to shadcn/ui.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';

function ViewVote({ submissionId }) {
  const [votes, setVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!submissionId || !userId || !token) return;

    apiClient
      .get('/interactions/votes/count', { params: { submissionId } })
      .then((res) => {
        setVotes(res.data || 0);
      })
      .catch(() => {});

    apiClient
      .get('/interactions/votes/status', { params: { submissionId } })
      .then((res) => {
        setHasVoted(res.data === true);
      })
      .catch(() => {});
  }, [submissionId]);

  const handleVote = () => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!userId || !token) {
      toast.error('User not logged in.');
      return;
    }

    if (!hasVoted) {
      apiClient
        .post(`/interactions/votes?submissionId=${submissionId}`)
        .then(() => {
          setVotes((prev) => prev + 1);
          setHasVoted(true);
          toast.success('Vote successful! Thank you!');
        })
        .catch(() => {
          toast.error('Vote failed.');
        });
    } else {
      apiClient
        .delete('/interactions/votes', { params: { submissionId } })
        .then(() => {
          setVotes((prev) => Math.max(prev - 1, 0));
          setHasVoted(false);
          toast.info('Vote canceled.');
        })
        .catch(() => {
          toast.error('Cancel vote failed.');
        });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{votes}</span>
      <Button
        onClick={handleVote}
        className="bg-warning text-warning-foreground hover:bg-warning/90"
      >
        {hasVoted ? 'Cancel Vote' : 'Vote'}
      </Button>
    </div>
  );
}

export default ViewVote;
