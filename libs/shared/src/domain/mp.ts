import { z } from 'zod';

export const MPRoleSchema = z.enum(['MEMBER', 'WHIP', 'LEADER', 'DEPUTY']);

export const MPSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  partyId: z.string().uuid(),
  constituencyId: z.string().uuid(),
  role: MPRoleSchema,
  joinedAt: z.string().date(),
});
export type MP = z.infer<typeof MPSchema>;
export type MPRole = z.infer<typeof MPRoleSchema>;
