/**
 * ComentsPage.jsx
 *
 * Public-facing comments view for a submission. Supports paginated load-more
 * and expandable replies. Migrated from MUI to shadcn/ui + Tailwind.
 *
 * Role: Public User
 * Developer: Beiqi Dai (migrated)
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import Navbar from "../Homepages/Navbar";
import Footer from "../Homepages/Footer";
import apiClient from "../api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EmptyState from "@/shared/components/EmptyState";
import AuthTokenManager from '@/auth/authTokenManager';


function CommentsPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [comments, setComments] = useState([]);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const currentUserId = AuthTokenManager.getUserId();

  const fetchComments = useCallback(
    async (pageToFetch = 1, reset = false) => {
      try {
        const res = await apiClient.get(`/interactions/comments/list`, {
          params: {
            submissionId,
            page: pageToFetch,
            size: 10,
            sortBy: "createdAt",
            order: "desc",
          },
        });
        const fetchedComments = res.data.data || [];
        const pages = res.data.pages || 1;

        setTotalPages(pages);

        if (reset) {
          setComments(fetchedComments);
          setPage(1);
        } else {
          setComments((prev) => [...prev, ...fetchedComments]);
          setPage(pageToFetch);
        }
      } catch (error) {
        toast.error("Failed to fetch comments.");
      }
    },
    [submissionId]
  );

  useEffect(() => {
    if (submissionId) {
      fetchComments(1, true);
    }
  }, [submissionId, fetchComments]);

  const handleLoadMore = () => {
    fetchComments(page + 1, false);
  };

  const toggleExpandedReplies = (commentId) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleBack = () => navigate(-1);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Button variant="outline" onClick={handleBack} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>

          <h1 className="mb-6 flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <MessageSquare className="h-7 w-7 text-primary" />
            Comments
          </h1>

          {comments.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No comments yet."
              description="Be the first to share your thoughts on this submission."
            />
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const commentId = comment._id || comment.id;
                const isExpanded = expandedReplies[commentId];
                const repliesToShow = isExpanded
                  ? comment.replies || []
                  : comment.replies?.slice(0, 1) || [];

                return (
                  <Card key={commentId} className="border-border/60">
                    <CardContent className="space-y-2 p-5">
                      <p className="text-sm font-semibold text-foreground">
                        {comment.userId === currentUserId ? "My comment" : "Anonymous"}
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {comment.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>

                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-5 mt-4 space-y-2 border-l-2 border-border pl-4">
                          {repliesToShow.map((reply) => (
                            <div
                              key={reply.id}
                              className="rounded-md bg-muted/40 p-3"
                            >
                              <p className="text-sm font-semibold text-foreground">
                                {reply.userId === currentUserId ? "My reply" : "Anonymous"}
                              </p>
                              <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                                {reply.content}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {new Date(reply.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}

                          {comment.replies.length > 1 && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => toggleExpandedReplies(commentId)}
                              className="text-amber-600 hover:text-amber-700"
                            >
                              {isExpanded ? "Hide replies" : "View more replies"}
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {page < totalPages && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleLoadMore}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Load More Comments
              </Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default CommentsPage;
