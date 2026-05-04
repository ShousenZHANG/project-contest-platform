/**
 * UserContestList.jsx
 *
 * Public contest browse list with search, filter, pagination. Migrated from MUI to shadcn/ui.
 *
 * Role: Public User
 * Developer: Beiqi Dai
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Homepages/Navbar";
import Footer from "../Homepages/Footer";
import ContestCard from "./UserContestCard";
import ChangeContestTable from "./PublicChangeContestTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, SlidersHorizontal, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
import defaultImage from "./1.jpg";
import apiClient from "../api/apiClient";

function Contest() {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedParticipationType, setSelectedParticipationType] = useState("");
  const [contests, setContests] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isListView, setIsListView] = useState(false);
  const [page, setPage] = useState(1);
  const size = 6;
  const navigate = useNavigate();

  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("keyword", searchTerm);
        if (selectedCategories.length > 0) params.append("category", selectedCategories.join(","));
        if (selectedStatus) params.append("status", selectedStatus);

        const response = await apiClient.get(`/competitions/list`, { params });
        setContests(response.data.data || []);
      } catch (error) {
        // fetch failed silently
      }
    };

    fetchContests();
  }, [searchTerm, selectedCategories, selectedStatus]);

  const formatDateRange = (start, end) => {
    if (!start || !end) return "N/A";
    return `${new Date(start).toLocaleDateString()} ~ ${new Date(end).toLocaleDateString()}`;
  };

  const handleCardClick = (contest) => {
    navigate(`/publiccontest-detail/${contest.id}`);
  };

  const handleSearchClick = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };

  const getStatusText = (status) => {
    switch (status) {
      case "UPCOMING":
        return "not started";
      case "ONGOING":
        return "in progress";
      case "COMPLETED":
        return "completed";
      default:
        return "unknown";
    }
  };

  const pages = Math.ceil(contests.length / size);
  const paginatedContests = contests.slice((page - 1) * size, page * size);
  const filteredContests = paginatedContests.filter((item) => {
    if (selectedParticipationType && item.participationType !== selectedParticipationType) return false;
    return true;
  });
  const allCategories = Array.from(new Set(contests.map((item) => item.category))).sort();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-10 px-4">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Contest List</h1>
            <p className="mt-2 text-muted-foreground">Discover and join exciting competitions</p>
          </header>

          {/* Toolbar */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contests..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearchClick} variant="default">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Filter">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Status</h4>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">All</option>
                      <option value="UPCOMING">UPCOMING</option>
                      <option value="ONGOING">ONGOING</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="AWARDED">AWARDED</option>
                    </select>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Participation Type</h4>
                    <select
                      value={selectedParticipationType}
                      onChange={(e) => {
                        setSelectedParticipationType(e.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">All</option>
                      <option value="INDIVIDUAL">INDIVIDUAL</option>
                      <option value="TEAM">TEAM</option>
                    </select>
                  </div>

                  {allCategories.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Category</h4>
                      <div className="flex flex-wrap gap-2">
                        {allCategories.map((category) => {
                          const isSelected = selectedCategories.includes(category);
                          return (
                            <Badge
                              key={category}
                              variant={isSelected ? "default" : "outline"}
                              className="cursor-pointer transition-all"
                              onClick={() => handleCategoryChange(category)}
                            >
                              {category}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="outline"
              size="icon"
              title="Toggle list / card view"
              onClick={() => setIsListView((prev) => !prev)}
            >
              {isListView ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </Button>
          </div>

          {/* Contest grid/table */}
          <div>
            {isListView ? (
              <ChangeContestTable
                contests={filteredContests.map((item) => ({
                  id: item.id,
                  title: item.name,
                  description: item.description,
                  category: item.category,
                  date: formatDateRange(item.startDate, item.endDate),
                  isPublic: item.isPublic,
                  status: item.status,
                  statusText: getStatusText(item.status),
                  allowedSubmissionTypes: item.allowedSubmissionTypes,
                  scoringCriteria: item.scoringCriteria,
                  introVideoUrl: item.introVideoUrl,
                  image: item.imageUrls?.[0] || defaultImage,
                  createdAt: item.createdAt,
                  participationType: item.participationType || "INDIVIDUAL",
                }))}
                onRowClick={handleCardClick}
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredContests.map((item) => (
                  <ContestCard
                    key={item.id}
                    contest={{
                      id: item.id,
                      title: item.name,
                      description: item.description,
                      category: item.category,
                      date: formatDateRange(item.startDate, item.endDate),
                      isPublic: item.isPublic,
                      status: item.status,
                      allowedSubmissionTypes: item.allowedSubmissionTypes,
                      scoringCriteria: item.scoringCriteria,
                      introVideoUrl: item.introVideoUrl,
                      image: item.imageUrls?.[0] || defaultImage,
                      createdAt: item.createdAt,
                      participationType: item.participationType || "INDIVIDUAL",
                    }}
                    onCardClick={handleCardClick}
                  />
                ))}
              </div>
            )}

            {filteredContests.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
                <p className="text-muted-foreground">No contests match your filters.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className="w-9"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                disabled={page === pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Contest;
