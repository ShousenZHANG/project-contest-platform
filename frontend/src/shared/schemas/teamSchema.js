import { z } from 'zod';

export const teamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(60),
  description: z.string().max(500).optional(),
  maxMembers: z.number().int().min(2).max(20).default(5),
});

export const teamUpdateSchema = teamSchema.partial();
