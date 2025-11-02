import { z } from 'zod';

export const SittingDaySchema = z.object({
  id: z.string().uuid(),
  worldId: z.string().uuid(),
  sessionId: z.string().uuid(),
  date: z.string().date(),
  chamber: z.enum(['COMMONS']),
});
export type SittingDay = z.infer<typeof SittingDaySchema>;
