/**
 * Rating.jsx
 *
 * Displays a list of competitions assigned to the current judge. Migrated from MUI to shadcn/ui.
 *
 * Role: Judge
 * Developer: Zhaoyi Yang
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Separator } from '../components/ui/separator';

function Rating() {
  const [competitions, setCompetitions] = useState([]);
  const [selectedComp, setSelectedComp] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const res = await apiClient.get(`/judges/my-competitions?page=1&size=100`);
        setCompetitions(res.data.data || []);
      } catch (err) {
        // Failed to fetch competitions
      }
    };
    fetchCompetitions();
  }, []);

  const fetchCompetitionDetail = async (id) => {
    try {
      const res = await apiClient.get(`/competitions/${id}`);
      setSelectedComp(res.data);
      setDialogOpen(true);
    } catch (error) {
      toast.error('Failed to fetch competition detail');
    }
  };

  return (
    <>
      <div className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          Competitions Assigned to You as Judge
        </h2>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {competitions.map((comp, index) => (
                    <tr key={comp.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="link"
                          className="h-auto p-0 text-primary"
                          onClick={() => fetchCompetitionDetail(comp.id)}
                        >
                          {comp.name}
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-md truncate">{comp.description}</td>
                      <td className="px-4 py-3">
                        <Badge variant={comp.status === 'COMPLETED' ? 'success' : 'secondary'}>
                          {comp.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          disabled={comp.status !== 'COMPLETED'}
                          onClick={() => navigate(`/JudgeSubmissions/${comp.id}`)}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {competitions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No competitions assigned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedComp?.name}</span>
              {selectedComp?.status && (
                <Badge variant="default">{selectedComp.status}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedComp && (
            <div className="space-y-3 text-sm">
              <p>{selectedComp.description}</p>
              <Separator />
              <p><strong>Category:</strong> {selectedComp.category}</p>
              <p><strong>Participation:</strong> {selectedComp.participationType}</p>
              <p><strong>Start:</strong> {new Date(selectedComp.startDate).toLocaleString()}</p>
              <p><strong>End:</strong> {new Date(selectedComp.endDate).toLocaleString()}</p>
              <p><strong>Public:</strong> {selectedComp.isPublic ? 'Yes' : 'No'}</p>
              <Separator />
              <div>
                <p className="font-medium">Scoring Criteria:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedComp.scoringCriteria?.map((item, idx) => (
                    <Badge key={idx} variant="outline">{item}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium">Allowed Submission Types:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedComp.allowedSubmissionTypes?.map((item, idx) => (
                    <Badge key={idx} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </div>
              {selectedComp.imageUrls?.length > 0 && (
                <div>
                  <p className="font-medium">Display Images:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedComp.imageUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`img-${idx}`}
                        className="h-24 w-32 rounded-md border object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
              {selectedComp.introVideoUrl && (
                <Button variant="outline" asChild>
                  <a href={selectedComp.introVideoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Watch Intro Video
                  </a>
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Rating;
