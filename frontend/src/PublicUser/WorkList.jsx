/**
 * WorkList.jsx
 *
 * Public-facing browse view for approved submissions in a competition.
 * Migrated from MUI to shadcn/ui + Tailwind.
 *
 * Role: Public User
 * Developer: Zhaoyi Yang (migrated)
 */
import React, { useState, useEffect } from "react";
import {
  Search,
  FileText,
  Image as ImageIcon,
  Code,
  File as FileIcon,
  Loader2,
  ExternalLink,
  Heart,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../Homepages/Navbar";
import Footer from "../Homepages/Footer";
import apiClient from "../api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

function WorkList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [competitionId, setCompetitionId] = useState("");
  const [works, setWorks] = useState([]);
  const [filteredWorks, setFilteredWorks] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get("competitionId");
    if (id) {
      setCompetitionId(id);
    }
  }, [location.search]);

  useEffect(() => {
    async function fetchWorks() {
      if (!competitionId) return;
      setLoading(true);
      try {
        const res = await apiClient.get(`/submissions/public/approved`, {
          params: { competitionId },
        });
        const items = res.data.data || [];
        const mappedWorks = await Promise.all(
          items.map(async (item, idx) => {
            let voteCount = 0;
            try {
              const voteRes = await apiClient.get(`/interactions/votes/count`, {
                params: { submissionId: item.id },
              });
              voteCount = parseInt(voteRes.data, 10) || 0;
            } catch {
              // vote count fetch failed — default to 0
            }
            return {
              id: item.id || String(idx),
              title: item.title || `Work ${idx}`,
              description: item.description || "No description.",
              fileType: item.fileType || "",
              fileUrl: item.fileUrl || "",
              voteCount,
            };
          })
        );
        setWorks(mappedWorks);
        setFilteredWorks(mappedWorks);
      } catch (err) {
        // fetch failed — works remain empty
      } finally {
        setLoading(false);
      }
    }
    fetchWorks();
  }, [competitionId]);

  const handleSearchClick = () => {
    const term = searchInput.trim().toLowerCase();
    if (!term) {
      setFilteredWorks(works);
    } else {
      const filtered = works.filter(
        (w) =>
          w.title.toLowerCase().includes(term) ||
          w.description.toLowerCase().includes(term)
      );
      setFilteredWorks(filtered);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchClick();
    }
  };

  const handleVoteClick = () => {
    toast.warning("Please log in first.");
  };

  const handleViewCommentClick = (id) => {
    navigate(`/publicusercoments/${id}`);
  };

  const getFileTypeIcon = (type) => {
    if (!type) return <FileIcon className="h-4 w-4 text-muted-foreground" />;
    if (type.startsWith("image/"))
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (type === "application/pdf")
      return <FileText className="h-4 w-4 text-red-500" />;
    if (type.includes("code") || type.includes("json") || type.includes("python"))
      return <Code className="h-4 w-4 text-emerald-500" />;
    return <FileIcon className="h-4 w-4 text-muted-foreground" />;
  };

  if (!competitionId) return null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-foreground">
            Approved Submissions
          </h1>

          {/* Search bar */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearchClick} variant="default">
              <Search className="mr-1.5 h-4 w-4" />
              Search
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card className="overflow-hidden border-border/60 shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-amber-500 text-white">
                      <th className="px-4 py-3 text-center font-semibold">Title</th>
                      <th className="px-4 py-3 text-center font-semibold">Description</th>
                      <th className="px-4 py-3 text-center font-semibold">Type</th>
                      <th className="px-4 py-3 text-center font-semibold">View File</th>
                      <th className="px-4 py-3 text-center font-semibold">Votes</th>
                      <th className="px-4 py-3 text-center font-semibold">Vote</th>
                      <th className="px-4 py-3 text-center font-semibold">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          No submissions found.
                        </td>
                      </tr>
                    ) : (
                      filteredWorks.map((w) => (
                        <tr
                          key={w.id}
                          className="border-b border-border/60 transition-colors hover:bg-muted/40 last:border-b-0"
                        >
                          <td className="px-4 py-3 text-center font-medium text-foreground">
                            {w.title}
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground">
                            {w.description}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              {getFileTypeIcon(w.fileType)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              className="bg-amber-500 hover:bg-amber-600"
                              asChild
                            >
                              <a
                                href={w.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                View
                              </a>
                            </Button>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-foreground">
                            {w.voteCount}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              className="bg-amber-500 hover:bg-amber-600"
                              onClick={() => handleVoteClick(w)}
                            >
                              <Heart className="mr-1 h-3.5 w-3.5" />
                              Vote
                            </Button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                              onClick={() => handleViewCommentClick(w.id)}
                            >
                              <MessageCircle className="mr-1 h-3.5 w-3.5" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default WorkList;
