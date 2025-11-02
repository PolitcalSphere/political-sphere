import { z } from 'zod';

export const ParliamentarySessionSchema = z.object({
  id: z.string().uuid(),
  worldId: z.string().uuid(),
  label: z.string().min(1),
  startsOn: z.string().date(),
  endsOn: z.string().date().optional(),
});
export type ParliamentarySession = z.infer<typeof ParliamentarySessionSchema>;
