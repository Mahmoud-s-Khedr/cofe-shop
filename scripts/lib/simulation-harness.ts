import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  data: T | null;
  error?: {
    code?: number;
    message?: string;
    timestamp?: string;
    path?: string;
  };
};

export type ApiResult<T> = {
  status: number;
  headers: Headers;
  body: ApiEnvelope<T> | null;
  rawText: string;
};

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type StepStatus = 'PASS' | 'FAIL' | 'EXPECTED_FAIL';

export type SummaryResourceMap = Record<string, Array<string | number>>;

export type SummaryData = {
  script: string;
  runId: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  baseUrl: string;
  logFile: string;
  summaryFile: string;
  totalSteps: number;
  passCount: number;
  failCount: number;
  expectedFailCount: number;
  failedSteps: Array<{ step: number; name: string; message: string }>;
  expectedFailures: Array<{ step: number; name: string; message: string }>;
  created: SummaryResourceMap;
  notes: string[];
};

export type SharedState = {
  runId: string;
  artifactDir: string;
  baseUrl: string;
  bootstrap?: {
    adminPhone: string;
    productIds: number[];
    productTitles: string[];
  };
  user?: {
    id: number;
    name: string;
    updatedName: string;
    phone: string;
    password: string;
    resetPassword: string;
    finalPassword: string;
  };
  orders?: {
    guestPrimary: { orderNumber: string; guestAccessToken: string };
    guestCancelled: { orderNumber: string; guestAccessToken: string };
    guestPickupLifecycle: { orderNumber: string; guestAccessToken: string; itemId: number; productId: number };
    registeredPickup: { orderNumber: string; itemId: number; productId: number };
    registeredReject: { orderNumber: string };
    registeredAdminCancel: { orderNumber: string };
  };
  review?: {
    rating: number;
    comment: string;
  };
  admin?: {
    managedProductId?: number;
    blockedUserId?: number;
  };
};

type RequestOptions = {
  method?: string;
  path: string;
  token?: string;
  guestToken?: string;
  json?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  multipartFile?: {
    fieldName: string;
    filePath: string;
    contentType?: string;
  };
};

type StepOptions = {
  expectFailure?: boolean;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function safeJson(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => safeJson(item));
  }
  if (typeof value === 'object' && value !== null) {
    const output: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = safeJson(item);
    }
    return output;
  }
  return String(value);
}

function compactBody(rawText: string): string {
  return rawText.length > 500 ? `${rawText.slice(0, 500)}...` : rawText;
}

export function createTimestampLabel(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function resolveBaseUrl(): string {
  const raw = process.env.BASE_URL?.trim();
  if (!raw) return 'http://localhost:800/api/v1';
  return raw.endsWith('/api/v1') ? raw : `${raw.replace(/\/+$/, '')}/api/v1`;
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export async function ensureArtifacts(runId?: string): Promise<{ runId: string; artifactDir: string }> {
  const finalRunId = runId ?? createTimestampLabel();
  const artifactDir = path.join(process.cwd(), 'artifacts', 'simulations', finalRunId);
  await mkdir(artifactDir, { recursive: true });
  return { runId: finalRunId, artifactDir };
}

export async function writeLatestRunMetadata(artifactDir: string, runId: string): Promise<void> {
  const latestPath = path.join(process.cwd(), 'artifacts', 'simulations', 'latest-run.json');
  await mkdir(path.dirname(latestPath), { recursive: true });
  await writeFile(latestPath, JSON.stringify({ artifactDir, runId, updatedAt: new Date().toISOString() }, null, 2));
}

export async function readLatestRunMetadata(): Promise<{ artifactDir: string; runId: string }> {
  const latestPath = path.join(process.cwd(), 'artifacts', 'simulations', 'latest-run.json');
  const raw = await readFile(latestPath, 'utf8');
  const parsed = JSON.parse(raw) as { artifactDir?: string; runId?: string };
  assert(parsed.artifactDir, 'latest-run.json is missing artifactDir');
  assert(parsed.runId, 'latest-run.json is missing runId');
  return { artifactDir: parsed.artifactDir, runId: parsed.runId };
}

export async function readSharedState(artifactDir: string): Promise<SharedState> {
  const raw = await readFile(path.join(artifactDir, 'shared-state.json'), 'utf8');
  return JSON.parse(raw) as SharedState;
}

export async function writeCombinedSummary(artifactDir: string, combined: Record<string, unknown>): Promise<void> {
  await writeFile(path.join(artifactDir, 'combined-summary.json'), JSON.stringify(combined, null, 2));
}

export class SimulationContext {
  readonly runId: string;
  readonly baseUrl: string;
  readonly artifactDir: string;
  readonly scriptName: string;
  readonly logFile: string;
  readonly summaryFile: string;

  private stepNumber = 0;
  private readonly startedAt = Date.now();
  private readonly summary: SummaryData;
  private sharedState: SharedState;

  constructor(input: { runId: string; baseUrl: string; artifactDir: string; scriptName: string }) {
    this.runId = input.runId;
    this.baseUrl = input.baseUrl;
    this.artifactDir = input.artifactDir;
    this.scriptName = input.scriptName;
    this.logFile = path.join(input.artifactDir, `${input.scriptName}.log`);
    this.summaryFile = path.join(input.artifactDir, `${input.scriptName}-summary.json`);
    this.sharedState = {
      runId: input.runId,
      artifactDir: input.artifactDir,
      baseUrl: input.baseUrl,
    };
    this.summary = {
      script: input.scriptName,
      runId: input.runId,
      startedAt: new Date(this.startedAt).toISOString(),
      baseUrl: input.baseUrl,
      logFile: this.logFile,
      summaryFile: this.summaryFile,
      totalSteps: 0,
      passCount: 0,
      failCount: 0,
      expectedFailCount: 0,
      failedSteps: [],
      expectedFailures: [],
      created: {},
      notes: [],
    };
  }

  getSummary(): SummaryData {
    return this.summary;
  }

  getSharedState(): SharedState {
    return this.sharedState;
  }

  setSharedState(state: SharedState): void {
    this.sharedState = state;
  }

  async initLog(): Promise<void> {
    await writeFile(this.logFile, '');
    await this.log('INFO', 'simulation.start', {
      script: this.scriptName,
      runId: this.runId,
      baseUrl: this.baseUrl,
    });
  }

  async log(level: 'INFO' | 'WARN' | 'ERROR', event: string, detail?: unknown): Promise<void> {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      detail: detail === undefined ? undefined : safeJson(detail),
    });
    await writeFile(this.logFile, `${line}\n`, { flag: 'a' });
  }

  note(message: string): void {
    this.summary.notes.push(message);
  }

  addCreated(kind: string, value: string | number): void {
    if (!this.summary.created[kind]) {
      this.summary.created[kind] = [];
    }
    this.summary.created[kind].push(value);
  }

  async saveSharedState(): Promise<void> {
    await writeFile(path.join(this.artifactDir, 'shared-state.json'), JSON.stringify(this.sharedState, null, 2));
  }

  async finish(): Promise<void> {
    this.summary.completedAt = new Date().toISOString();
    this.summary.durationMs = Date.now() - this.startedAt;
    await writeFile(this.summaryFile, JSON.stringify(this.summary, null, 2));
    await this.log('INFO', 'simulation.complete', this.summary);
  }

  async step<T>(name: string, run: () => Promise<T>, options: StepOptions = {}): Promise<T> {
    const step = ++this.stepNumber;
    this.summary.totalSteps += 1;
    await this.log('INFO', 'step.start', { step, name, expectFailure: options.expectFailure === true });

    try {
      const result = await run();
      if (options.expectFailure) {
        this.summary.expectedFailCount += 1;
        this.summary.expectedFailures.push({ step, name, message: 'Observed expected failure condition' });
        await this.log('WARN', 'step.expected_fail', { step, name });
        return result;
      }

      this.summary.passCount += 1;
      await this.log('INFO', 'step.pass', { step, name });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (options.expectFailure) {
        this.summary.failCount += 1;
        this.summary.failedSteps.push({ step, name, message });
        await this.log('ERROR', 'step.expected_fail_missed', { step, name, message });
        throw error;
      }

      this.summary.failCount += 1;
      this.summary.failedSteps.push({ step, name, message });
      await this.log('ERROR', 'step.fail', { step, name, message });
      throw error;
    }
  }

  async api<T>(options: RequestOptions): Promise<ApiResult<T>> {
    const url = new URL(`${this.baseUrl}${options.path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const headers = new Headers();
    headers.set('Accept', 'application/json');
    headers.set('X-Request-Id', randomUUID());
    if (options.token) {
      headers.set('Authorization', `Bearer ${options.token}`);
    }
    if (options.guestToken) {
      headers.set('X-Order-Token', options.guestToken);
    }

    let body: BodyInit | undefined;
    if (options.multipartFile) {
      const form = new FormData();
      const fileBuffer = await readFile(options.multipartFile.filePath);
      const blob = new Blob([fileBuffer], {
        type: options.multipartFile.contentType ?? 'application/octet-stream',
      });
      form.append(options.multipartFile.fieldName, blob, path.basename(options.multipartFile.filePath));
      body = form;
    } else if (options.json !== undefined) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(options.json);
    }

    const response = await fetch(url, {
      method: options.method ?? (options.json !== undefined || options.multipartFile ? 'POST' : 'GET'),
      headers,
      body,
    });
    const rawText = await response.text();
    let parsed: ApiEnvelope<T> | null = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText) as ApiEnvelope<T>;
      } catch {
        parsed = null;
      }
    }

    await this.log('INFO', 'http.response', {
      method: options.method ?? (options.json !== undefined || options.multipartFile ? 'POST' : 'GET'),
      path: `${options.path}${url.search}`,
      status: response.status,
      body: compactBody(rawText),
    });

    return { status: response.status, headers: response.headers, body: parsed, rawText };
  }
}

export function expectSuccess<T>(result: ApiResult<T>, status: number | number[]): ApiEnvelope<T> {
  const allowed = Array.isArray(status) ? status : [status];
  if (!allowed.includes(result.status) || !result.body?.success || result.body.data === null) {
    throw new Error(`Expected success status ${allowed.join('/')} but got ${result.status}: ${compactBody(result.rawText)}`);
  }
  return result.body;
}

export function expectFailure(result: ApiResult<unknown>, status: number | number[], contains?: string): ApiEnvelope<unknown> {
  const allowed = Array.isArray(status) ? status : [status];
  if (!allowed.includes(result.status) || result.body?.success !== false) {
    throw new Error(`Expected failure status ${allowed.join('/')} but got ${result.status}: ${compactBody(result.rawText)}`);
  }
  const message = result.body.error?.message ?? '';
  if (contains && !message.includes(contains)) {
    throw new Error(`Expected error message to contain "${contains}" but got "${message}"`);
  }
  return result.body;
}
