import { z } from 'zod';

export const DebateStateSchema = z.enum(['QUEUED', 'LIVE', 'SUSPENDED', 'ADJOURNED', 'CLOSED']);

export const DebateSchema = z.object({
  id: z.string().uuid(),
  worldId: z.string().uuid(),
  topic: z.string().min(1),
  orderPaperItemId: z.string().uuid(),
  state: DebateStateSchema,
  startedAt: z.string().date().optional(),
  endedAt: z.string().date().optional(),
});
export type Debate = z.infer<typeof DebateSchema>;
export type DebateState = z.infer<typeof DebateStateSchema>;
