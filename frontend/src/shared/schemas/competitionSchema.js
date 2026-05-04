import { z } from 'zod';

export const competitionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(2000).optional(),
  category: z.string().min(1, 'Category is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isPublic: z.boolean().default(true),
  status: z.string().optional(),
  participationType: z.enum(['INDIVIDUAL', 'TEAM']).default('INDIVIDUAL'),
  allowedSubmissionTypes: z.array(z.string()).min(1, 'At least one submission type required'),
  scoringCriteria: z.array(z.string()).optional().default([]),
});

export const competitionUpdateSchema = competitionSchema.partial();
