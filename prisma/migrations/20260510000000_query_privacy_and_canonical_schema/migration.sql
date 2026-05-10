-- Harden query audit records by removing raw prompt text and raw IP storage.
ALTER TABLE "Query" ADD COLUMN "taskHash" TEXT NOT NULL DEFAULT 'legacy-unhashed';
ALTER TABLE "Query" ADD COLUMN "ipHash" TEXT NOT NULL DEFAULT 'legacy-unhashed';
ALTER TABLE "Query" ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + interval '30 days');
ALTER TABLE "Query" ALTER COLUMN "resultJson" DROP NOT NULL;
ALTER TABLE "Query" DROP COLUMN "taskText";
ALTER TABLE "Query" DROP COLUMN "ipAddress";
ALTER TABLE "Query" ALTER COLUMN "taskHash" DROP DEFAULT;
ALTER TABLE "Query" ALTER COLUMN "ipHash" DROP DEFAULT;
ALTER TABLE "Query" ALTER COLUMN "expiresAt" DROP DEFAULT;

-- Canonical fact-store scaffolding for snapshot-based source ingestion.
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "homepageUrl" TEXT,
    "refreshCadence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceSnapshot" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observedAt" TIMESTAMP(3),
    "parserVersion" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "etag" TEXT,
    "lastModified" TEXT,
    "contentType" TEXT,
    "bodyText" TEXT,
    "bodyJson" JSONB,
    "fetchHeaders" JSONB,

    CONSTRAINT "SourceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModelIdentity" (
    "id" TEXT NOT NULL,
    "providerNamespace" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "family" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "modelType" TEXT NOT NULL DEFAULT 'base_model',
    "modalities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModelAlias" (
    "id" TEXT NOT NULL,
    "modelIdentityId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "sourceId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModelOffer" (
    "id" TEXT NOT NULL,
    "modelIdentityId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiId" TEXT,
    "hostedBy" TEXT,
    "contextWindow" INTEGER,
    "maxOutputTokens" INTEGER,
    "costInputPer1M" DOUBLE PRECISION,
    "costOutputPer1M" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sourceId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "ModelOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BenchmarkDefinition" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'base_model',
    "metricKind" TEXT NOT NULL,
    "scale" TEXT,
    "higherIsBetter" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenchmarkDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BenchmarkRun" (
    "id" TEXT NOT NULL,
    "benchmarkId" TEXT NOT NULL,
    "sourceSnapshotId" TEXT,
    "version" TEXT NOT NULL,
    "runLabel" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "normalizedWithinRun" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BenchmarkRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScoreObservation" (
    "id" TEXT NOT NULL,
    "modelIdentityId" TEXT NOT NULL,
    "benchmarkId" TEXT NOT NULL,
    "benchmarkRunId" TEXT,
    "sourceId" TEXT NOT NULL,
    "sourceSnapshotId" TEXT,
    "rawScore" DOUBLE PRECISION,
    "rawLabel" TEXT,
    "normalizedScore" DOUBLE PRECISION,
    "metricUnit" TEXT,
    "provenance" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "conflictSetId" TEXT,
    "notes" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreObservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageExample" (
    "id" TEXT NOT NULL,
    "modelIdentityId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceSnapshotId" TEXT,
    "title" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "language" TEXT,
    "docUrl" TEXT NOT NULL,
    "codeSnippetRef" TEXT,
    "qualityScore" DOUBLE PRECISION,
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageExample_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EditorialOverride" (
    "id" TEXT NOT NULL,
    "modelIdentityId" TEXT,
    "benchmarkId" TEXT,
    "sourceId" TEXT,
    "fieldPath" TEXT NOT NULL,
    "overrideJson" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorialOverride_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Query_userId_createdAt_idx" ON "Query"("userId", "createdAt");
CREATE INDEX "Query_expiresAt_idx" ON "Query"("expiresAt");
CREATE UNIQUE INDEX "SourceSnapshot_sourceId_checksum_key" ON "SourceSnapshot"("sourceId", "checksum");
CREATE INDEX "SourceSnapshot_sourceId_fetchedAt_idx" ON "SourceSnapshot"("sourceId", "fetchedAt");
CREATE UNIQUE INDEX "ModelIdentity_providerNamespace_slug_key" ON "ModelIdentity"("providerNamespace", "slug");
CREATE INDEX "ModelIdentity_providerNamespace_idx" ON "ModelIdentity"("providerNamespace");
CREATE UNIQUE INDEX "ModelAlias_namespace_alias_key" ON "ModelAlias"("namespace", "alias");
CREATE INDEX "ModelAlias_modelIdentityId_idx" ON "ModelAlias"("modelIdentityId");
CREATE INDEX "ModelOffer_modelIdentityId_idx" ON "ModelOffer"("modelIdentityId");
CREATE INDEX "ModelOffer_provider_apiId_idx" ON "ModelOffer"("provider", "apiId");
CREATE INDEX "BenchmarkDefinition_category_scope_idx" ON "BenchmarkDefinition"("category", "scope");
CREATE UNIQUE INDEX "BenchmarkRun_benchmarkId_version_key" ON "BenchmarkRun"("benchmarkId", "version");
CREATE INDEX "BenchmarkRun_sourceSnapshotId_idx" ON "BenchmarkRun"("sourceSnapshotId");
CREATE INDEX "ScoreObservation_modelIdentityId_benchmarkId_idx" ON "ScoreObservation"("modelIdentityId", "benchmarkId");
CREATE INDEX "ScoreObservation_benchmarkRunId_idx" ON "ScoreObservation"("benchmarkRunId");
CREATE INDEX "ScoreObservation_sourceId_observedAt_idx" ON "ScoreObservation"("sourceId", "observedAt");
CREATE INDEX "ScoreObservation_conflictSetId_idx" ON "ScoreObservation"("conflictSetId");
CREATE INDEX "UsageExample_modelIdentityId_taskType_idx" ON "UsageExample"("modelIdentityId", "taskType");
CREATE INDEX "UsageExample_sourceId_idx" ON "UsageExample"("sourceId");
CREATE INDEX "EditorialOverride_modelIdentityId_idx" ON "EditorialOverride"("modelIdentityId");
CREATE INDEX "EditorialOverride_benchmarkId_idx" ON "EditorialOverride"("benchmarkId");
CREATE INDEX "EditorialOverride_status_idx" ON "EditorialOverride"("status");

ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModelAlias" ADD CONSTRAINT "ModelAlias_modelIdentityId_fkey" FOREIGN KEY ("modelIdentityId") REFERENCES "ModelIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModelAlias" ADD CONSTRAINT "ModelAlias_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModelOffer" ADD CONSTRAINT "ModelOffer_modelIdentityId_fkey" FOREIGN KEY ("modelIdentityId") REFERENCES "ModelIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModelOffer" ADD CONSTRAINT "ModelOffer_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BenchmarkDefinition" ADD CONSTRAINT "BenchmarkDefinition_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BenchmarkRun" ADD CONSTRAINT "BenchmarkRun_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "BenchmarkDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BenchmarkRun" ADD CONSTRAINT "BenchmarkRun_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScoreObservation" ADD CONSTRAINT "ScoreObservation_modelIdentityId_fkey" FOREIGN KEY ("modelIdentityId") REFERENCES "ModelIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoreObservation" ADD CONSTRAINT "ScoreObservation_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "BenchmarkDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoreObservation" ADD CONSTRAINT "ScoreObservation_benchmarkRunId_fkey" FOREIGN KEY ("benchmarkRunId") REFERENCES "BenchmarkRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScoreObservation" ADD CONSTRAINT "ScoreObservation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScoreObservation" ADD CONSTRAINT "ScoreObservation_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageExample" ADD CONSTRAINT "UsageExample_modelIdentityId_fkey" FOREIGN KEY ("modelIdentityId") REFERENCES "ModelIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageExample" ADD CONSTRAINT "UsageExample_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsageExample" ADD CONSTRAINT "UsageExample_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EditorialOverride" ADD CONSTRAINT "EditorialOverride_modelIdentityId_fkey" FOREIGN KEY ("modelIdentityId") REFERENCES "ModelIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EditorialOverride" ADD CONSTRAINT "EditorialOverride_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "BenchmarkDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EditorialOverride" ADD CONSTRAINT "EditorialOverride_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
