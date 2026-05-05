import type { CuratedModel } from "@/lib/modelCatalog";
import type {
  BenchmarkDimension,
  BenchmarkScore,
  TaskDimensions,
} from "@/types/model";

type PriorProfile = Partial<Record<BenchmarkDimension, number>>;

const FRONTIER_PRIORS: Record<string, PriorProfile> = {
  "GPT-5.5": {
    reasoning: 95,
    coding: 94,
    instruction_following: 96,
    overall: 97,
    speed: 58,
    cost_efficiency: 34,
  },
  "Claude Opus 4.7": {
    reasoning: 94,
    coding: 89,
    instruction_following: 97,
    overall: 96,
    speed: 55,
    cost_efficiency: 38,
  },
  "Gemini 3.1 Pro Preview": {
    reasoning: 93,
    coding: 88,
    instruction_following: 92,
    overall: 94,
    speed: 60,
    cost_efficiency: 58,
  },
  "GPT-5.4": {
    reasoning: 91,
    coding: 91,
    instruction_following: 92,
    overall: 93,
    speed: 66,
    cost_efficiency: 52,
  },
  "Claude Sonnet 4.6": {
    reasoning: 90,
    coding: 88,
    instruction_following: 93,
    overall: 92,
    speed: 68,
    cost_efficiency: 55,
  },
  "Grok 4.3": {
    reasoning: 88,
    coding: 82,
    instruction_following: 88,
    overall: 89,
    speed: 70,
    cost_efficiency: 72,
  },
  "DeepSeek V4 Pro": {
    reasoning: 86,
    coding: 84,
    instruction_following: 87,
    overall: 88,
    speed: 70,
    cost_efficiency: 90,
  },
  "Kimi K2.6": {
    reasoning: 86,
    coding: 85,
    instruction_following: 86,
    overall: 87,
    speed: 68,
    cost_efficiency: 82,
  },
  "Qwen3-Max": {
    reasoning: 85,
    coding: 84,
    instruction_following: 85,
    overall: 86,
    speed: 66,
    cost_efficiency: 78,
  },
};

export function shouldUseCatalogPriors(dimensions: Partial<TaskDimensions>) {
  const overall = dimensions.overall ?? 0;
  const instructionFollowing = dimensions.instruction_following ?? 0;

  return overall >= 0.35 || instructionFollowing >= 0.5;
}

export function buildCatalogPriorScores(
  model: CuratedModel,
): BenchmarkScore[] {
  if (model.status !== "active") {
    return [];
  }

  const profile = FRONTIER_PRIORS[model.name] ?? inferPriorProfile(model);

  return Object.entries(profile).map(([dimension, score]) => ({
    source: "catalog_prior",
    dimension: dimension as BenchmarkDimension,
    score,
    rawLabel: "Curated catalog prior",
  }));
}

function inferPriorProfile(model: CuratedModel): PriorProfile {
  const familyScore = inferFamilyScore(model.name);
  const speedScore = inferSpeedScore(model.name);
  const costScore = inferCostEfficiency(model);

  return {
    reasoning: familyScore - 3,
    coding: familyScore - 5,
    instruction_following: familyScore - 2,
    overall: familyScore,
    speed: speedScore,
    ...(costScore === undefined ? {} : { cost_efficiency: costScore }),
  };
}

function inferFamilyScore(name: string) {
  const normalized = name.toLowerCase();

  if (/opus|gpt-5|gemini 3|grok 4/.test(normalized)) {
    return 88;
  }

  if (/sonnet|gemini 2\.5 pro|deepseek|kimi|qwen3|max/.test(normalized)) {
    return 84;
  }

  if (/flash|mini|nano|haiku|lite|small/.test(normalized)) {
    return 76;
  }

  return 80;
}

function inferSpeedScore(name: string) {
  const normalized = name.toLowerCase();

  if (/flash|nano|lite|mini|haiku/.test(normalized)) {
    return 90;
  }

  if (/sonnet|grok|deepseek|kimi|qwen/.test(normalized)) {
    return 70;
  }

  return 60;
}

function inferCostEfficiency(model: CuratedModel) {
  if (model.costInputPer1M === null && model.costOutputPer1M === null) {
    return undefined;
  }

  const totalCost =
    (model.costInputPer1M ?? model.costOutputPer1M ?? 0) +
    (model.costOutputPer1M ?? model.costInputPer1M ?? 0);

  if (totalCost <= 1) {
    return 96;
  }

  if (totalCost <= 5) {
    return 86;
  }

  if (totalCost <= 12) {
    return 72;
  }

  if (totalCost <= 25) {
    return 56;
  }

  if (totalCost <= 40) {
    return 42;
  }

  return 28;
}
