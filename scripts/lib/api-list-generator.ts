import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';

type OpenApiSchema = {
  $ref?: string;
  type?: string;
  format?: string;
  description?: string;
  example?: unknown;
  enum?: unknown[];
  nullable?: boolean;
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  additionalProperties?: boolean | OpenApiSchema;
  allOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
};

type OpenApiMediaType = {
  schema?: OpenApiSchema;
};

type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  tags?: string[];
  security?: Array<Record<string, unknown>>;
  requestBody?: {
    content?: Record<string, OpenApiMediaType>;
  };
  responses?: Record<string, { content?: Record<string, OpenApiMediaType>; description?: string }>;
};

type OpenApiDoc = {
  paths?: Record<string, Record<string, OpenApiOperation>>;
  security?: Array<Record<string, unknown>>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
};

type SchemaField = {
  name: string;
  type: string;
  required: boolean;
  description: string;
  enumValues: string;
  example: string;
};

type SchemaDetails = {
  title: string;
  type: string;
  description: string;
  fields: SchemaField[];
};

export type RestApiItem = {
  type: 'rest';
  module: string;
  name: string;
  method: string;
  path: string;
  auth: 'bearer' | 'public';
  summary: string;
  requestSchema?: OpenApiSchema;
  responseSchemas: Array<{ status: string; schema?: OpenApiSchema; description?: string }>;
  notes: string;
};

export type WsApiItem = {
  type: 'ws';
  module: string;
  name: string;
  event: string;
  channel: string;
  auth: 'bearer' | 'public';
  summary: string;
  requestShapeRef: string;
  responseShapeRef: string;
  notes: string;
};

export function parseRestApisFromOpenApi(doc: OpenApiDoc): RestApiItem[] {
  const items: RestApiItem[] = [];
  const dedup = new Set<string>();
  const paths = doc.paths ?? {};

  for (const [apiPath, methods] of Object.entries(paths)) {
    for (const [methodRaw, op] of Object.entries(methods ?? {})) {
      const method = methodRaw.toUpperCase();
      const operationId = op?.operationId ?? '';
      const dedupKey = `${operationId}|${method}|${apiPath}`;
      if (dedup.has(dedupKey)) {
        continue;
      }
      dedup.add(dedupKey);

      const module = op?.tags?.[0] ?? 'Untagged';
      const summary = op?.summary?.trim() || operationId || `${method} ${apiPath}`;
      const security = op?.security;
      const auth: 'bearer' | 'public' =
        (Array.isArray(security) && security.length > 0) ||
        (!security && Array.isArray(doc.security) && doc.security.length > 0)
          ? 'bearer'
          : 'public';

      const requestSchema = pickRequestSchema(op);
      const responseSchemas = pickResponseSchemas(op);

      items.push({
        type: 'rest',
        module,
        name: operationId || `${method} ${apiPath}`,
        method,
        path: apiPath,
        auth,
        summary,
        requestSchema,
        responseSchemas,
        notes: '',
      });
    }
  }

  return items.sort((a, b) =>
    a.module.localeCompare(b.module) ||
    a.path.localeCompare(b.path) ||
    a.method.localeCompare(b.method),
  );
}

export function parseWsApisFromGatewaySource(source: string, filePath: string): WsApiItem[] {
  const classMatch = source.match(/export\s+class\s+(\w+)/);
  const className = classMatch?.[1] ?? basename(filePath, '.ts');
  const namespaceMatch = source.match(/@WebSocketGateway\(([^)]*)\)/s);
  const namespace = namespaceMatch?.[1].match(/namespace\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? '/';

  const items: WsApiItem[] = [];
  const dedup = new Set<string>();
  const subscribePattern =
    /@SubscribeMessage\(\s*['"]([^'"]+)['"]\s*\)\s*(?:public\s+|private\s+|protected\s+)?(?:async\s+)?(\w+)\s*\(/g;

  let match: RegExpExecArray | null;
  while ((match = subscribePattern.exec(source)) !== null) {
    const event = match[1];
    const methodName = match[2];
    const requestShapeRef = extractBodyDtoFromMethodSignature(source, match.index, methodName);
    const responseShapeRef = extractEmitEventFromMethodBody(source, methodName) || 'ack payload';
    const dedupKey = `${className}|${event}`;
    if (dedup.has(dedupKey)) {
      continue;
    }
    dedup.add(dedupKey);

    items.push({
      type: 'ws',
      module: className,
      name: methodName,
      event,
      channel: namespace,
      auth: 'bearer',
      summary: `Handle ${event}`,
      requestShapeRef,
      responseShapeRef,
      notes: 'JWT required in Socket auth/header during connection.',
    });
  }

  return items.sort((a, b) =>
    a.module.localeCompare(b.module) ||
    a.event.localeCompare(b.event) ||
    a.name.localeCompare(b.name),
  );
}

export function renderApiListMarkdown(
  restItems: RestApiItem[],
  wsItems: WsApiItem[],
  doc?: OpenApiDoc,
): string {
  const lines: string[] = [];
  lines.push('# API List');
  lines.push('');
  lines.push('Generated from `openapi.json` (REST) and `src/**/*.gateway.ts` (WebSocket).');
  lines.push('');

  lines.push('## REST APIs');
  lines.push('');

  const restGroups = groupBy(restItems, (item) => item.module);
  if (restGroups.size === 0) {
    lines.push('_No REST APIs found._');
    lines.push('');
  } else {
    for (const [module, items] of [...restGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`### ${module}`);
      lines.push('');
      lines.push('| Method | Path | Auth | Summary |');
      lines.push('|---|---|---|---|');
      for (const item of items) {
        lines.push(
          `| ${item.method} | ${escapePipes(item.path)} | ${item.auth} | ${escapePipes(item.summary)} |`,
        );
      }
      lines.push('');

      for (const item of items) {
        lines.push(`#### ${item.method} ${item.path}`);
        lines.push('');
        lines.push(`- Name: \`${item.name}\``);
        lines.push(`- Auth: \`${item.auth}\``);
        lines.push(`- Summary: ${item.summary}`);
        if (item.notes) {
          lines.push(`- Notes: ${item.notes}`);
        }
        lines.push('');

        lines.push('**Request**');
        lines.push('');
        if (!item.requestSchema) {
          lines.push('_No request body._');
          lines.push('');
        } else {
          renderSchemaBlock(lines, item.requestSchema, doc, 'Request body');
        }

        const successResponses = item.responseSchemas.filter((r) => isSuccessStatus(r.status));
        const errorResponses = item.responseSchemas.filter((r) => !isSuccessStatus(r.status));

        lines.push('**Success Response**');
        lines.push('');
        if (successResponses.length === 0) {
          lines.push('_No documented success response body._');
          lines.push('');
        } else {
          for (const response of successResponses) {
            lines.push(`- Status: \`${response.status}\`${response.description ? ` — ${response.description}` : ''}`);
            if (response.schema) {
              renderSchemaBlock(lines, response.schema, doc, `Response ${response.status}`);
            } else {
              lines.push('  - _No response body._');
              lines.push('');
            }
          }
        }

        lines.push('**Error Responses**');
        lines.push('');
        if (errorResponses.length === 0) {
          lines.push('_No documented error responses._');
          lines.push('');
        } else {
          lines.push('| Status | Description | Body |');
          lines.push('|---|---|---|');
          for (const response of errorResponses) {
            lines.push(
              `| ${response.status} | ${escapePipes(response.description ?? '-')} | ${escapePipes(schemaLabel(response.schema))} |`,
            );
          }
          lines.push('');
        }
      }
    }
  }

  lines.push('## WebSocket APIs');
  lines.push('');
  const wsGroups = groupBy(wsItems, (item) => item.module);
  if (wsGroups.size === 0) {
    lines.push('_No WebSocket APIs found._');
    lines.push('');
  } else {
    for (const [module, items] of [...wsGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`### ${module}`);
      lines.push('');
      lines.push('| Event | Channel | Auth | Summary |');
      lines.push('|---|---|---|---|');
      for (const item of items) {
        lines.push(
          `| ${escapePipes(item.event)} | ${escapePipes(item.channel)} | ${item.auth} | ${escapePipes(item.summary)} |`,
        );
      }
      lines.push('');

      for (const item of items) {
        lines.push(`#### Event \`${item.event}\``);
        lines.push('');
        lines.push(`- Handler: \`${item.name}\``);
        lines.push(`- Channel: \`${item.channel}\``);
        lines.push(`- Auth: \`${item.auth}\``);
        lines.push(`- Summary: ${item.summary}`);
        if (item.notes) {
          lines.push(`- Notes: ${item.notes}`);
        }
        lines.push('');

        lines.push('**Request Payload**');
        lines.push('');
        lines.push(`- Shape: \`${item.requestShapeRef || '-'}\``);
        lines.push('');

        lines.push('**Response Payload / Emitted Events**');
        lines.push('');
        lines.push(`- Shape: \`${item.responseShapeRef || 'ack payload'}\``);
        lines.push('');
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

export function generateApiList(args?: {
  openApiPath?: string;
  sourceDir?: string;
  outputPath?: string;
}): void {
  const openApiPath = resolve(args?.openApiPath ?? 'openapi.json');
  const sourceDir = resolve(args?.sourceDir ?? 'src');
  const outputPath = resolve(args?.outputPath ?? 'docs/api-list.md');

  let openApiRaw: string;
  try {
    openApiRaw = readFileSync(openApiPath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to read ${relative(process.cwd(), openApiPath)}. Generate Swagger first so openapi.json exists. Original error: ${message}`,
    );
  }

  const doc = JSON.parse(openApiRaw) as OpenApiDoc;
  const restItems = parseRestApisFromOpenApi(doc);

  const gatewayFiles = listGatewayFiles(sourceDir);
  const wsItems = gatewayFiles.flatMap((gatewayFile) => {
    const source = readFileSync(gatewayFile, 'utf8');
    return parseWsApisFromGatewaySource(source, gatewayFile);
  });

  const markdown = renderApiListMarkdown(restItems, wsItems, doc);
  writeFileSync(outputPath, markdown, 'utf8');
}

function listGatewayFiles(sourceDir: string): string[] {
  const output = execSync(`rg --files "${sourceDir}" -g "*.gateway.ts"`, {
    encoding: 'utf8',
  });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => resolve(line))
    .sort((a, b) => a.localeCompare(b));
}

function pickRequestSchema(operation: OpenApiOperation): OpenApiSchema | undefined {
  const content = operation?.requestBody?.content;
  if (!content) {
    return undefined;
  }
  for (const mediaType of ['application/json', ...Object.keys(content)]) {
    const schema = content[mediaType]?.schema;
    if (schema) {
      return schema;
    }
  }
  return undefined;
}

function pickResponseSchemas(
  operation: OpenApiOperation,
): Array<{ status: string; schema?: OpenApiSchema; description?: string }> {
  const responses = operation?.responses ?? {};
  const statuses = Object.keys(responses).sort((a, b) => {
    const aScore = isSuccessStatus(a) ? 0 : 1;
    const bScore = isSuccessStatus(b) ? 0 : 1;
    if (aScore !== bScore) {
      return aScore - bScore;
    }
    return a.localeCompare(b);
  });

  return statuses.map((status) => {
    const content = responses[status]?.content;
    let schema: OpenApiSchema | undefined;
    if (content) {
      for (const mediaType of ['application/json', ...Object.keys(content)]) {
        schema = content[mediaType]?.schema;
        if (schema) {
          break;
        }
      }
    }

    return {
      status,
      schema,
      description: responses[status]?.description,
    };
  });
}

function renderSchemaBlock(
  lines: string[],
  schema: OpenApiSchema,
  doc: OpenApiDoc | undefined,
  fallbackTitle: string,
): void {
  const details = describeSchema(schema, doc, fallbackTitle);
  lines.push(`- Shape: \`${details.title}\``);
  lines.push(`- Type: \`${details.type}\``);
  if (details.description) {
    lines.push(`- Description: ${details.description}`);
  }
  if (details.fields.length === 0) {
    lines.push('- Fields: _No object fields documented._');
    lines.push('');
    return;
  }

  lines.push('');
  lines.push('| Field | Type | Required | Enum | Example | Description |');
  lines.push('|---|---|---|---|---|---|');
  for (const field of details.fields) {
    lines.push(
      `| ${escapePipes(field.name)} | ${escapePipes(field.type)} | ${field.required ? 'yes' : 'no'} | ${escapePipes(field.enumValues)} | ${escapePipes(field.example)} | ${escapePipes(field.description)} |`,
    );
  }
  lines.push('');
}

function describeSchema(
  schema: OpenApiSchema,
  doc: OpenApiDoc | undefined,
  fallbackTitle: string,
): SchemaDetails {
  const resolved = resolveSchema(schema, doc);
  const title = schemaLabel(schema) || fallbackTitle;
  const type = schemaTypeLabel(resolved);
  const description = resolved.description ?? '';

  const fields = flattenSchemaFields(resolved, doc);
  return {
    title,
    type,
    description,
    fields,
  };
}

function flattenSchemaFields(schema: OpenApiSchema, doc: OpenApiDoc | undefined): SchemaField[] {
  const resolved = resolveSchema(schema, doc);

  if (resolved.allOf?.length) {
    return resolved.allOf.flatMap((child) => flattenSchemaFields(child, doc));
  }

  if (resolved.oneOf?.length) {
    return [
      {
        name: '(oneOf)',
        type: resolved.oneOf.map((s) => schemaTypeLabel(resolveSchema(s, doc))).join(' | '),
        required: false,
        description: 'One of the listed schema variants.',
        enumValues: '-',
        example: '-',
      },
    ];
  }

  if (resolved.anyOf?.length) {
    return [
      {
        name: '(anyOf)',
        type: resolved.anyOf.map((s) => schemaTypeLabel(resolveSchema(s, doc))).join(' | '),
        required: false,
        description: 'Any of the listed schema variants.',
        enumValues: '-',
        example: '-',
      },
    ];
  }

  if (resolved.type === 'array' && resolved.items) {
    return flattenSchemaFields(resolved.items, doc).map((f) => ({ ...f, name: `[]${f.name}` }));
  }

  const properties = resolved.properties ?? {};
  const requiredSet = new Set(resolved.required ?? []);

  const fields = Object.entries(properties).map(([name, propertySchema]) => {
    const prop = resolveSchema(propertySchema, doc);
    return {
      name,
      type: schemaTypeLabel(prop),
      required: requiredSet.has(name),
      description: prop.description ?? '',
      enumValues: Array.isArray(prop.enum) && prop.enum.length > 0 ? prop.enum.map(String).join(', ') : '-',
      example: formatExample(prop.example),
    };
  });

  if (fields.length > 0) {
    return fields;
  }

  if (resolved.additionalProperties && typeof resolved.additionalProperties === 'object') {
    return [
      {
        name: '[key: string]',
        type: schemaTypeLabel(resolveSchema(resolved.additionalProperties, doc)),
        required: false,
        description: 'Dictionary value type',
        enumValues: '-',
        example: '-',
      },
    ];
  }

  return [];
}

function resolveSchema(schema: OpenApiSchema, doc: OpenApiDoc | undefined): OpenApiSchema {
  if (!schema.$ref) {
    return schema;
  }

  const ref = schema.$ref;
  const parts = ref.split('/');
  const schemaName = parts[parts.length - 1];
  if (!schemaName) {
    return schema;
  }

  const resolved = doc?.components?.schemas?.[schemaName];
  if (!resolved) {
    return schema;
  }

  return resolved;
}

function schemaLabel(schema?: OpenApiSchema): string {
  if (!schema) {
    return '-';
  }
  if (schema.$ref) {
    const parts = schema.$ref.split('/');
    return parts[parts.length - 1] || schema.$ref;
  }
  if (schema.oneOf) {
    return `oneOf(${schema.oneOf.length})`;
  }
  if (schema.anyOf) {
    return `anyOf(${schema.anyOf.length})`;
  }
  if (schema.allOf) {
    return `allOf(${schema.allOf.length})`;
  }
  if (schema.type === 'array') {
    return `array<${schema.items ? schemaTypeLabel(schema.items) : 'unknown'}>`;
  }
  return schema.type ?? 'inline/unknown';
}

function schemaTypeLabel(schema: OpenApiSchema): string {
  if (schema.$ref) {
    const parts = schema.$ref.split('/');
    return parts[parts.length - 1] || 'ref';
  }
  if (schema.oneOf?.length) {
    return `oneOf<${schema.oneOf.map((s) => schemaTypeLabel(s)).join(' | ')}>`;
  }
  if (schema.anyOf?.length) {
    return `anyOf<${schema.anyOf.map((s) => schemaTypeLabel(s)).join(' | ')}>`;
  }
  if (schema.allOf?.length) {
    return `allOf<${schema.allOf.map((s) => schemaTypeLabel(s)).join(' & ')}>`;
  }
  if (schema.type === 'array') {
    return `array<${schema.items ? schemaTypeLabel(schema.items) : 'unknown'}>`;
  }
  if (schema.type === 'object') {
    return 'object';
  }
  if (schema.type) {
    return schema.format ? `${schema.type}(${schema.format})` : schema.type;
  }
  return 'unknown';
}

function formatExample(example: unknown): string {
  if (example === undefined) {
    return '-';
  }
  if (typeof example === 'string') {
    return example;
  }
  try {
    return JSON.stringify(example);
  } catch {
    return String(example);
  }
}

function isSuccessStatus(status: string): boolean {
  return /^2\d\d$/.test(status) || status === 'default';
}

function extractBodyDtoFromMethodSignature(
  source: string,
  subscribeDecoratorStartIdx: number,
  methodName: string,
): string {
  const methodPattern = new RegExp(`(?:async\\s+)?${methodName}\\s*\\(`);
  const methodMatch = methodPattern.exec(source.slice(subscribeDecoratorStartIdx));
  if (!methodMatch) {
    return '-';
  }

  const methodStart = subscribeDecoratorStartIdx + methodMatch.index;
  const signatureStart = source.indexOf('(', methodStart);
  if (signatureStart < 0) {
    return '-';
  }

  const signatureEnd = findMatchingParen(source, signatureStart);
  if (signatureEnd < 0) {
    return '-';
  }

  const params = source.slice(signatureStart + 1, signatureEnd);
  const match = params.match(/@MessageBody\(\)\s*\w+\s*:\s*([\w.]+)/);
  return match?.[1] ?? '-';
}

function extractEmitEventFromMethodBody(source: string, methodName: string): string | null {
  const startPattern = new RegExp(`(?:async\\s+)?${methodName}\\s*\\(`);
  const startMatch = startPattern.exec(source);
  if (!startMatch) {
    return null;
  }

  const startIdx = startMatch.index;
  const signatureStart = source.indexOf('(', startIdx);
  if (signatureStart < 0) {
    return null;
  }
  const signatureEnd = findMatchingParen(source, signatureStart);
  if (signatureEnd < 0) {
    return null;
  }

  const braceStart = findMethodBodyBrace(source, signatureEnd + 1);
  if (braceStart < 0) {
    return null;
  }

  const endIdx = findMatchingBrace(source, braceStart);

  if (endIdx < 0) {
    return null;
  }

  const methodBody = source.slice(braceStart, endIdx + 1);
  const emitMatches = [...methodBody.matchAll(/\.emit\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  if (emitMatches.length === 0) {
    return 'ack payload';
  }

  const unique = [...new Set(emitMatches)];
  return unique.join(', ');
}

function findMatchingParen(source: string, openParenIndex: number): number {
  let depth = 0;
  for (let i = openParenIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function findMatchingBrace(source: string, openBraceIndex: number): number {
  let depth = 0;
  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function findMethodBodyBrace(source: string, fromIndex: number): number {
  let angleDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let inString: '"' | "'" | '`' | null = null;

  for (let i = fromIndex; i < source.length; i += 1) {
    const ch = source[i];
    const prev = i > 0 ? source[i - 1] : '';

    if (inString) {
      if (ch === inString && prev !== '\\') {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === '\'' || ch === '`') {
      inString = ch;
      continue;
    }

    if (ch === '<') {
      angleDepth += 1;
      continue;
    }
    if (ch === '>') {
      angleDepth = Math.max(0, angleDepth - 1);
      continue;
    }
    if (ch === '(') {
      parenDepth += 1;
      continue;
    }
    if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (ch === '[') {
      bracketDepth += 1;
      continue;
    }
    if (ch === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }
    if (ch === '{') {
      if (angleDepth === 0 && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
        return i;
      }
      braceDepth += 1;
      continue;
    }
    if (ch === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
    }
  }

  return -1;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }
  return grouped;
}

function escapePipes(value: string): string {
  return value.replace(/\|/g, '\\|');
}
