/**
 * ViewVote.jsx
 *
 * Vote count + toggle for a submission. Migrated from MUI to shadcn/ui.
 *
 * The toggle is optimistic: the count and the button label change on click and
 * roll back if the request fails. A vote that takes a round trip to acknowledge
 * feels broken, and this control is the most-clicked thing on the page.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { voteService } from '../services/interactionService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap } from '../api/queryFn';
import { Button } from '../components/ui/button';
import AuthTokenManager from '@/auth/authTokenManager';

function ViewVote({ submissionId }) {
  const queryClient = useQueryClient();

  const signedIn = Boolean(AuthTokenManager.getUserId() && AuthTokenManager.getToken());
  const enabled = Boolean(submissionId) && signedIn;

  const countKey = queryKeys.votes.count(submissionId);
  const statusKey = queryKeys.votes.hasVoted(submissionId);

  // Both endpoints answer with a bare value rather than the ApiResponse
  // envelope, so unwrap hands back the number and the boolean directly.
  const { data: votes = 0 } = useQuery({
    queryKey: countKey,
    queryFn: () => unwrap(voteService.getCount(submissionId)),
    enabled,
    staleTime: staleTime.live,
  });

  const { data: hasVoted = false } = useQuery({
    queryKey: statusKey,
    queryFn: () => unwrap(voteService.hasVoted(submissionId)),
    select: (value) => value === true,
    enabled,
    staleTime: staleTime.live,
  });

  const toggleVote = useMutation({
    mutationFn: (voting) =>
      voting
        ? unwrap(voteService.vote(submissionId))
        : unwrap(voteService.unvote(submissionId)),

    onMutate: async (voting) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: countKey }),
        queryClient.cancelQueries({ queryKey: statusKey }),
      ]);

      const previous = {
        count: queryClient.getQueryData(countKey),
        status: queryClient.getQueryData(statusKey),
      };

      queryClient.setQueryData(countKey, (current = 0) =>
        voting ? current + 1 : Math.max(current - 1, 0)
      );
      queryClient.setQueryData(statusKey, voting);

      return previous;
    },

    onError: (_error, voting, context) => {
      if (context) {
        queryClient.setQueryData(countKey, context.count);
        queryClient.setQueryData(statusKey, context.status);
      }
      toast.error(voting ? 'Vote failed.' : 'Cancel vote failed.');
    },

    onSuccess: (_data, voting) => {
      if (voting) {
        toast.success('Vote successful! Thank you!');
      } else {
        toast.info('Vote canceled.');
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: countKey });
      queryClient.invalidateQueries({ queryKey: statusKey });
    },
  });

  const handleVote = () => {
    if (!signedIn) {
      toast.error('User not logged in.');
      return;
    }
    toggleVote.mutate(!hasVoted);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{votes}</span>
      <Button
        onClick={handleVote}
        className="bg-warning text-warning-foreground hover:bg-warning/90"
        aria-label={
          hasVoted
            ? `Cancel your vote — ${votes} votes so far`
            : `Vote for this submission — ${votes} votes so far`
        }
      >
        {hasVoted ? 'Cancel Vote' : 'Vote'}
      </Button>
    </div>
  );
}

export default ViewVote;
