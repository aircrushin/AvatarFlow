import { z } from 'zod';

const slug = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 只能包含小写字母、数字和连字符');

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色必须是 #RRGGBB 格式');

export const themeSchema = z.object({
  logoUrl: z.string().max(2048).nullable(),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  backgroundColor: hexColor,
  avatarBackground: hexColor,
  borderEnabled: z.boolean(),
  borderColor: hexColor,
  borderWidth: z.number().int().min(0).max(40),
  stickerEnabled: z.boolean(),
  stickerText: z.string().max(40),
  instructions: z.string().max(1000),
  contact: z.string().max(500),
});

export const styleConfigSchema = z.object({
  styleName: z.string().min(1).max(64),
  styleOptions: z.record(z.string(), z.unknown()),
  sortOrder: z.number().int().min(0),
});

export const createEventSchema = z.object({
  slug,
  name: z.string().min(1).max(120),
  subtitle: z.string().max(200).default(''),
  description: z.string().max(4000).default(''),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  generationLimit: z.number().int().positive().max(10_000_000).nullable().optional(),
  theme: themeSchema,
  styles: z.array(styleConfigSchema).min(1).max(63),
});

/**
 * Explicit update schema with NO defaults. Deriving this from createEventSchema
 * would re-apply create-time defaults (e.g. status='draft') to fields that the
 * caller omitted, silently resetting them on a partial PATCH.
 */
export const updateEventSchema = z.object({
  slug,
  name: z.string().min(1).max(120),
  subtitle: z.string().max(200),
  description: z.string().max(4000),
  status: z.enum(['draft', 'active', 'paused', 'expired']),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  generationLimit: z.number().int().positive().max(10_000_000).nullable(),
  theme: themeSchema.partial(),
  styles: z.array(styleConfigSchema).min(1).max(63),
}).partial();

export const generateSchema = z.object({
  styleName: z.string().min(1).max(64),
  seed: z.string().max(256).optional(),
  options: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  format: z.enum(['svg', 'png']).default('png'),
  size: z.number().int().min(64).max(2048).default(1024),
});

export const trackSchema = z.object({
  eventType: z.enum(['page_view', 'avatar_generate', 'avatar_download', 'share_click']),
  /** Stable per-browser id used only for de-duplication. Not personal data. */
  visitorId: z.string().uuid().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type GenerateInput = z.infer<typeof generateSchema>;
export type TrackInput = z.infer<typeof trackSchema>;
