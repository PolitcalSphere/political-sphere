import { z } from 'zod';

export const BillStageSchema = z.object({
  id: z.string().uuid(),
  worldId: z.string().uuid(),
  billId: z.string().uuid(),
  stage: z.enum(['FIRST_READING', 'SECOND_READING', 'COMMITTEE', 'REPORT', 'THIRD_READING']),
  startedAt: z.string().date(),
  endedAt: z.string().date().optional(),
});
export type BillStage = z.infer<typeof BillStageSchema>;
