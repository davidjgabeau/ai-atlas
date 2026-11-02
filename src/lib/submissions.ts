import { z } from "zod";

export const submissionSchema = z.object({
  company_name: z.string().trim().min(1).max(160),
  website_url: z.string().trim().max(2_048).url().refine((url) => /^https?:\/\//i.test(url)),
  founder_name: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().email().max(254),
  description: z.string().trim().max(5_000).optional().default(""),
});
