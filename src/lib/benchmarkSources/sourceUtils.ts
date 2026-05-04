import { z } from "zod";

const rowSchema = z.record(z.string(), z.unknown());
const rowsSchema = z.array(rowSchema);

export type SourceRow = z.infer<typeof rowSchema>;

const providerPatterns: Array<[RegExp, string]> = [
  [/gpt|openai|o1|o3|o4/i, "OpenAI"],
  [/claude|anthropic/i, "Anthropic"],
  [/gemini|palm|google/i, "Google"],
  [/llama|meta/i, "Meta"],
  [/mistral|mixtral|codestral/i, "Mistral"],
  [/deepseek/i, "DeepSeek"],
  [/qwen|alibaba/i, "Alibaba"],
  [/grok|xai/i, "xAI"],
  [/command|cohere/i, "Cohere"],
  [/yi-|01-ai/i, "01.AI"],
  [/reka/i, "Reka"],
  [/jamba|ai21/i, "AI21"],
];

export function inferProvider(modelName: string, explicitProvider?: string): string {
  if (explicitProvider && explicitProvider.trim().length > 0) {
    return explicitProvider.trim();
  }

  const match = providerPatterns.find(([pattern]) => pattern.test(modelName));
  return match?.[1] ?? "Unknown";
}

export function getString(row: SourceRow, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

export function getNumber(row: SourceRow, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const numeric = Number.parseFloat(value.replace(/[$,%\s,]/g, ""));

      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
  }

  return undefined;
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json,text/csv,text/html;q=0.9,*/*;q=0.8",
      "user-agent": "which-model-benchmark-refresh/1.0",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.text();
}

export async function fetchJson(url: string): Promise<unknown> {
  const text = await fetchText(url);
  return JSON.parse(text) as unknown;
}

export function extractRows(input: unknown): SourceRow[] {
  const directRows = rowsSchema.safeParse(input);

  if (directRows.success) {
    return directRows.data;
  }

  const rows: SourceRow[] = [];
  const seen = new Set<unknown>();

  function visit(value: unknown): void {
    if (!value || typeof value !== "object" || seen.has(value)) {
      return;
    }

    seen.add(value);

    const parsedRow = rowSchema.safeParse(value);
    if (parsedRow.success) {
      rows.push(parsedRow.data);
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    for (const nestedValue of Object.values(value)) {
      visit(nestedValue);
    }
  }

  visit(input);
  return rows;
}

export function parseCsvRows(text: string): SourceRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

export function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === "\"" && nextCharacter === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (character === "\"") {
      quoted = !quoted;
      continue;
    }

    if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

export function logSourceError(source: string, error: unknown): void {
  console.error("[benchmark-source-error]", {
    source,
    message: error instanceof Error ? error.message : String(error),
  });
}
