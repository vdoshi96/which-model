import { z } from "zod";

export const benchmarkCategorySchema = z.enum([
  "overall",
  "reasoning",
  "coding",
  "instruction_following",
  "creative_writing",
  "math",
  "tool_use",
  "speed",
  "cost_efficiency",
  "long_context",
]);

export const benchmarkDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: benchmarkCategorySchema,
  scale: z.enum(["0_100", "elo", "rank", "price"]),
  higherIsBetter: z.boolean(),
  description: z.string().min(1),
  limitations: z.string().min(1),
  sourceUrl: z.string().url(),
  lastVerified: z.string().min(10),
});

export const sourcePageOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  url: z.string().url().optional(),
});

export const sourceFilterSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum([
    "arena_nav",
    "category",
    "leaderboard_page",
    "license",
    "range",
    "rank_by",
    "style_control",
    "table_view",
  ]),
  optionCount: z.number().int().positive().optional(),
  options: z.array(sourcePageOptionSchema).optional(),
  range: z
    .object({
      min: z.number(),
      max: z.number(),
      unit: z.string().min(1),
    })
    .optional(),
  notes: z.string().optional(),
});

export const sourcePageStatsSchema = z.object({
  asOf: z.string().min(10),
  votes: z.number().int().nonnegative().optional(),
  models: z.number().int().nonnegative().optional(),
  arenas: z.number().int().nonnegative().optional(),
});

export const curatedSourcePageSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
  kind: z.enum(["overview", "leaderboard", "raw_data", "docs"]),
  sourceCategoryLabels: z.array(z.string().min(1)),
  benchmarkCategories: z.array(benchmarkCategorySchema),
  stats: sourcePageStatsSchema.optional(),
  filters: z.array(sourceFilterSchema),
  notes: z.string(),
});

export const curatedSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  provider: z.string().min(1),
  homepage: z.string().url(),
  description: z.string().min(1),
  lastVerified: z.string().min(10),
  pages: z.array(curatedSourcePageSchema),
});

export const scoreSourceReferenceSchema = z.union([
  z.string().url(),
  z.string().regex(/^docs\/.+/),
]);

export const curatedModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  apiIds: z.array(z.string()),
  aliases: z.array(z.string()),
  status: z.enum([
    "frontier",
    "active",
    "preview",
    "legacy",
    "deprecated",
    "retired",
  ]),
  releaseDate: z.string().nullable(),
  contextWindow: z.number().int().positive().nullable(),
  costInputPer1M: z.number().nonnegative().nullable(),
  costOutputPer1M: z.number().nonnegative().nullable(),
  modalities: z.array(z.string().min(1)),
  infrastructure: z.array(z.string().min(1)),
  strengthTags: z.array(z.string().min(1)),
  sourceUrls: z.array(z.string().url()),
  lastVerified: z.string().min(10),
  notes: z.string(),
});

export const modelBenchmarkScoreSchema = z.object({
  modelId: z.string().min(1),
  benchmarkId: z.string().min(1),
  score: z.number(),
  normalizedScore: z.number().min(0).max(100),
  rawLabel: z.string().min(1),
  sourceUrl: scoreSourceReferenceSchema,
  lastVerified: z.string().min(10),
  provenance: z.enum(["measured", "derived_metadata", "editorial_prior"]),
  notes: z.string(),
});

export const curatedCatalogSchema = z.object({
  benchmarks: z.array(benchmarkDefinitionSchema),
  sources: z.array(curatedSourceSchema),
  models: z.array(curatedModelSchema),
  scores: z.array(modelBenchmarkScoreSchema),
});

export type BenchmarkCategory = z.infer<typeof benchmarkCategorySchema>;
export type BenchmarkDefinition = z.infer<typeof benchmarkDefinitionSchema>;
export type CuratedSource = z.infer<typeof curatedSourceSchema>;
export type CuratedSourcePage = z.infer<typeof curatedSourcePageSchema>;
export type CuratedCatalogModel = z.infer<typeof curatedModelSchema>;
export type ModelBenchmarkScore = z.infer<typeof modelBenchmarkScoreSchema>;
export type CuratedCatalog = z.infer<typeof curatedCatalogSchema>;
