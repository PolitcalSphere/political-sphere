import { z } from 'zod';

export const DivisionResultSchema = z.enum(['PENDING', 'AYE', 'NO', 'TIED', 'NO_QUORUM']);

export const DivisionSchema = z.object({
  id: z.string().uuid(),
  worldId: z.string().uuid(),
  motionId: z.string().uuid(),
  openedAt: z.string().date(),
  closedAt: z.string().date().optional(),
  result: DivisionResultSchema,
  tellerIds: z.array(z.string().uuid()).optional(),
});
export type Division = z.infer<typeof DivisionSchema>;
export type DivisionResult = z.infer<typeof DivisionResultSchema>;
