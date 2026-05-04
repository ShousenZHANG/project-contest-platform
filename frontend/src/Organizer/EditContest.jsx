/**
 * @file EditContest.jsx
 * @description
 * Edit an existing competition. Migrated from MUI to shadcn/ui.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';

const CATEGORIES = [
  'Design & Creativity',
  'Programming & Technology',
  'Business & Entrepreneurship',
  'Mathematics & Science',
  'Humanities & Social Sciences',
  'Music & Performing Arts',
  'Others',
];

const SUBMISSION_FORMATS = ['PDF', 'ZIP', 'CODE', 'Image', 'Text'];

const TEXTAREA_CLASS =
  'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function EditContest() {
  const [contestData, setContestData] = useState({
    contestName: '',
    contestDescription: '',
    category: '',
    startDate: '',
    endDate: '',
    isPublic: 'Public',
    scoringCriteria: [],
    submissionFormats: [],
    participationType: '',
  });

  const [newCriteria, setNewCriteria] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const competitionId = searchParams.get('competitionId');
  const { email } = useParams();

  useEffect(() => {
    if (!competitionId) return;
    apiClient
      .get(`/competitions/${competitionId}`)
      .then((res) => {
        const data = res.data;
        if (data && data.id) {
          setContestData({
            contestName: data.name,
            contestDescription: data.description,
            category: data.category,
            startDate: data.startDate.slice(0, 10),
            endDate: data.endDate.slice(0, 10),
            isPublic: data.isPublic ? 'Public' : 'Private',
            scoringCriteria: data.scoringCriteria || [],
            submissionFormats: data.allowedSubmissionTypes || [],
            participationType: data.participationType,
          });
        }
      })
      .catch(() => {});
  }, [competitionId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContestData((prev) => ({ ...prev, [name]: value }));
  };

  const addCriteria = () => {
    if (newCriteria.trim() !== '') {
      setContestData((prev) => ({
        ...prev,
        scoringCriteria: [...prev.scoringCriteria, newCriteria],
      }));
      setNewCriteria('');
    }
  };

  const removeCriteria = (index) => {
    setContestData((prev) => ({
      ...prev,
      scoringCriteria: prev.scoringCriteria.filter((_, i) => i !== index),
    }));
  };

  const handleFormatChange = (format) => {
    setContestData((prev) => ({
      ...prev,
      submissionFormats: prev.submissionFormats.includes(format)
        ? prev.submissionFormats.filter((f) => f !== format)
        : [...prev.submissionFormats, format],
    }));
  };

  const getAutoStatus = () => {
    const now = new Date();
    const start = new Date(contestData.startDate + 'T00:00:00');
    const end = new Date(contestData.endDate + 'T23:59:59');
    if (now < start) return 'UPCOMING';
    if (now >= start && now <= end) return 'ONGOING';
    return 'COMPLETED';
  };

  const handleUpdate = async () => {
    try {
      const start = new Date(contestData.startDate + 'T10:00:00Z');
      const end = new Date(contestData.endDate + 'T18:00:00Z');

      const payload = {
        name: contestData.contestName,
        description: contestData.contestDescription,
        category: contestData.category,
        startDate: start.toISOString().replace('.000', ''),
        endDate: end.toISOString().replace('.000', ''),
        isPublic: contestData.isPublic === 'Public',
        status: getAutoStatus(),
        allowedSubmissionTypes: contestData.submissionFormats,
        scoringCriteria: contestData.scoringCriteria,
        participationType: contestData.participationType,
        imageUrls: [],
        introVideoUrl: '',
      };

      await apiClient.put(`/competitions/update/${competitionId}`, payload);
      toast.success('Contest updated successfully');
      navigate(`/OrganizerContestList/${email}`);
    } catch (error) {
      toast.error(
        'Failed to update contest: ' +
          (error.response?.data?.message || 'Unknown error')
      );
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Contest</h1>
        <p className="text-sm text-muted-foreground">
          Update contest details, scoring rules, and visibility.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="contestName">Contest Name</Label>
              <Input
                id="contestName"
                name="contestName"
                value={contestData.contestName}
                onChange={handleChange}
                placeholder="Enter contest name"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="contestDescription">Description</Label>
              <textarea
                id="contestDescription"
                name="contestDescription"
                value={contestData.contestDescription}
                onChange={handleChange}
                rows={3}
                placeholder="Describe your contest"
                className={TEXTAREA_CLASS}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                value={contestData.category}
                onChange={handleChange}
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="participationType">Participation Type</Label>
              <select
                id="participationType"
                name="participationType"
                value={contestData.participationType}
                onChange={handleChange}
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  Select participation type
                </option>
                <option value="INDIVIDUAL">INDIVIDUAL</option>
                <option value="TEAM">TEAM</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                name="startDate"
                value={contestData.startDate}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                name="endDate"
                value={contestData.endDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Scoring Criteria</Label>
            <div className="flex gap-2">
              <Input
                value={newCriteria}
                onChange={(e) => setNewCriteria(e.target.value)}
                placeholder="Enter scoring criteria"
              />
              <Button type="button" onClick={addCriteria}>
                Add
              </Button>
            </div>
            {contestData.scoringCriteria.length > 0 && (
              <ul className="mt-2 space-y-1">
                {contestData.scoringCriteria.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span>{c}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriteria(i)}
                      aria-label="Remove criterion"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label>Submission Formats</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {SUBMISSION_FORMATS.map((format) => (
                <label
                  key={format}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={contestData.submissionFormats.includes(format)}
                    onChange={() => handleFormatChange(format)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                  {format}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="flex gap-4">
              {['Public', 'Private'].map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="isPublic"
                    value={opt}
                    checked={contestData.isPublic === opt}
                    onChange={handleChange}
                    className="h-4 w-4 border-input text-primary focus:ring-ring"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Computed Status</Label>
            <Input id="status" value={getAutoStatus()} disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-2 border-t border-border bg-background py-3">
        <Button
          variant="outline"
          onClick={() => navigate(`/OrganizerContestList/${email}`)}
        >
          Cancel
        </Button>
        <Button onClick={handleUpdate}>Update Contest</Button>
      </div>
    </div>
  );
}

export default EditContest;
