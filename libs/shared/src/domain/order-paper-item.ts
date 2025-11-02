import { z } from 'zod';

export const OrderPaperItemSchema = z.object({
  id: z.string().uuid(),
  worldId: z.string().uuid(),
  sittingDayId: z.string().uuid(),
  kind: z.enum(['MOTION', 'BILL_STAGE', 'URGENT_Q']),
  refId: z.string().uuid(),
  position: z.number().int(),
});
export type OrderPaperItem = z.infer<typeof OrderPaperItemSchema>;
