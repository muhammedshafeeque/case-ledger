import { z } from "zod";

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;

export type CursorPageMeta = {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
};
