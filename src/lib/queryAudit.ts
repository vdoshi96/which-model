import { createHmac } from "crypto";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

type AuditModel = {
  name?: unknown;
  provider?: unknown;
  score?: unknown;
  weightedScore?: unknown;
  model?: {
    name?: unknown;
    provider?: unknown;
  };
};

type ResultAuditInput = {
  taskSummary?: unknown;
  dimensions?: unknown;
  recommendations?: AuditModel[];
  models?: AuditModel[];
};

const DEFAULT_QUERY_LOG_RETENTION_DAYS = 30;

export function hashSensitiveValue(value: string): string {
  return createHmac("sha256", getQueryLogSalt()).update(value).digest("hex");
}

export function buildResultAuditPayload(result: ResultAuditInput): JsonObject {
  const models = result.recommendations ?? result.models ?? [];

  return {
    taskSummaryHash:
      typeof result.taskSummary === "string"
        ? hashSensitiveValue(result.taskSummary)
        : null,
    dimensions: toJsonValue(result.dimensions ?? null),
    resultCount: models.length,
    models: models.slice(0, 10).map(toModelAuditPayload),
  };
}

export function buildQueryLogData({
  task,
  ipAddress,
  result,
  userId,
}: {
  task: string;
  ipAddress: string;
  result: ResultAuditInput;
  userId?: string;
}) {
  return {
    taskHash: hashSensitiveValue(task),
    ipHash: hashSensitiveValue(ipAddress),
    userId,
    resultJson: buildResultAuditPayload(result),
    expiresAt: new Date(Date.now() + getRetentionDays() * 24 * 60 * 60 * 1000),
  };
}

function toModelAuditPayload(model: AuditModel): JsonObject {
  const modelDetails = model.model ?? model;
  const score = model.score ?? model.weightedScore ?? null;

  return {
    name: stringifyOrNull(modelDetails.name),
    provider: stringifyOrNull(modelDetails.provider),
    score: typeof score === "number" ? score : null,
  };
}

function stringifyOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getQueryLogSalt(): string {
  return (
    process.env.QUERY_LOG_SALT ??
    process.env.NEXTAUTH_SECRET ??
    "which-model-development-query-log-salt"
  );
}

function getRetentionDays(): number {
  const retentionDays = Number(process.env.QUERY_LOG_RETENTION_DAYS);

  if (Number.isInteger(retentionDays) && retentionDays > 0) {
    return retentionDays;
  }

  return DEFAULT_QUERY_LOG_RETENTION_DAYS;
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
