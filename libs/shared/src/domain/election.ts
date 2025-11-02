import { z } from 'zod';

export const ElectionStatusSchema = z.enum(['ANNOUNCED', 'POLLING', 'COUNTING', 'DECLARED']);

export const ElectionSchema = z.object({
  id: z.string().uuid(),
  worldId: z.string().uuid(),
  constituencyId: z.string().uuid(),
  status: ElectionStatusSchema,
  startedAt: z.string().date(),
  endedAt: z.string().date().optional(),
});
export type Election = z.infer<typeof ElectionSchema>;
export type ElectionStatus = z.infer<typeof ElectionStatusSchema>;
