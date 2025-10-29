import crypto from 'node:crypto';
import {
  sanitizeHtml,
  isValidInput,
  isValidLength,
  validateCategory,
  validateTag,
  isValidUrl,
  NEWS_ALLOWED_STATUSES
} from '@political-sphere/shared';

const REQUIRED_FIELDS = ['title', 'excerpt', 'content'];
const ALLOWED_CATEGORIES = [
  'politics',
  'economy',
  'social',
  'technology',
  'environment',
  'health',
  'finance',
  'governance',
  'policy',
  'general',
];
const MAX_TAGS = 10;
const MAX_SOURCES = 10;
const MAX_SOURCE_URL_LENGTH = 2048;
const ALLOWED_SOURCE_PROTOCOLS = ['https'];
const LOCALHOST_SOURCE_NAMES = ['localhost', '127.0.0.1'];
const MAX_AUTHOR_LENGTH = 120;
const DEFAULT_CATEGORY = 'general';
const DEFAULT_STATUS = 'published';
const ALLOWED_STATUSES = Array.from(NEWS_ALLOWED_STATUSES);

function createValidationError(message, details) {
  const error = new Error(message);
  error.code = 'VALIDATION_ERROR';
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}

function assertPayloadObject(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createValidationError('Payload must be a JSON object', 'payload');
  }
}

function resolveCategory(category) {
  if (category === undefined || category === null || category === '') {
    return DEFAULT_CATEGORY;
  }
  const validated = validateCategory(category);
  if (!validated) {
    throw createValidationError(
      `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
      'category',
    );
  }
  return validated;
}

function validateTextField(fieldName, value, min, max) {
  if (typeof value !== 'string') {
    throw createValidationError(`${fieldName} must be a string`, fieldName.toLowerCase());
  }
  const trimmed = value.trim();
  if (!isValidLength(trimmed, min, max)) {
    throw createValidationError(
      `${fieldName} must be between ${min} and ${max} characters`,
      fieldName.toLowerCase(),
    );
  }
  if (!isValidInput(trimmed)) {
    throw createValidationError(
      `${fieldName} contains invalid characters or patterns`,
      fieldName.toLowerCase(),
    );
  }
  return trimmed;
}

function sanitizeTagsInput(tags) {
  if (tags === undefined || tags === null) {
    return [];
  }
  if (!Array.isArray(tags)) {
    throw createValidationError('Tags must be an array of strings', 'tags');
  }
  if (tags.length > MAX_TAGS) {
    throw createValidationError(`Too many tags. Maximum allowed: ${MAX_TAGS}`, 'tags');
  }
  const sanitized = [];
  for (const tag of tags) {
    const validated = validateTag(tag);
    if (!validated) {
      throw createValidationError(`Invalid tag format: ${tag}`, 'tags');
    }
    sanitized.push(validated);
  }
  return Array.from(new Set(sanitized));
}

function sanitizeSourcesInput(sources) {
  if (sources === undefined || sources === null) {
    return [];
  }
  if (!Array.isArray(sources)) {
    throw createValidationError('Sources must be an array of URLs', 'sources');
  }
  if (sources.length > MAX_SOURCES) {
    throw createValidationError(`Too many sources. Maximum allowed: ${MAX_SOURCES}`, 'sources');
  }

  const sanitized = [];
  for (const rawSource of sources) {
    if (typeof rawSource !== 'string') {
      throw createValidationError('Source URL must be a string', 'sources');
    }
    const candidate = rawSource.trim();
    if (!candidate) {
      continue;
    }
    if (candidate.length > MAX_SOURCE_URL_LENGTH) {
      throw createValidationError(
        `Source URL exceeds maximum length of ${MAX_SOURCE_URL_LENGTH} characters`,
        'sources',
      );
    }
    if (!isValidUrl(candidate, [...ALLOWED_SOURCE_PROTOCOLS, 'http'])) {
      throw createValidationError(`Invalid source URL: ${candidate}`, 'sources');
    }
    const parsed = new URL(candidate);
    const protocol = parsed.protocol.replace(':', '');
    if (!ALLOWED_SOURCE_PROTOCOLS.includes(protocol)) {
      if (!(protocol === 'http' && LOCALHOST_SOURCE_NAMES.includes(parsed.hostname))) {
        throw createValidationError(
          'Insecure source URL protocol. Use HTTPS or localhost for development-only sources',
          'sources',
        );
      }
    }
    sanitized.push(parsed.toString());
  }

  return Array.from(new Set(sanitized));
}

function normalizeStatus(status) {
  if (status === undefined || status === null || status === '') {
    return DEFAULT_STATUS;
  }
  if (typeof status !== 'string') {
    throw createValidationError(
      `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      'status',
    );
  }
  const normalized = status.trim().toLowerCase();
  if (!NEWS_ALLOWED_STATUSES.has(normalized)) {
    throw createValidationError(
      `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      'status',
    );
  }
  return normalized;
}

function sanitizeAuthor(author, fallback = 'system') {
  if (author === undefined || author === null || author === '') {
    return fallback;
  }
  if (typeof author !== 'string') {
    throw createValidationError('Author must be a string', 'author');
  }
  const trimmed = author.trim();
  if (!isValidLength(trimmed, 1, MAX_AUTHOR_LENGTH)) {
    throw createValidationError(
      `Author must be between 1 and ${MAX_AUTHOR_LENGTH} characters`,
      'author',
    );
  }
  if (!isValidInput(trimmed)) {
    throw createValidationError('Author contains invalid characters or patterns', 'author');
  }
  return sanitizeHtml(trimmed);
}

function cloneRecord(record) {
  if (!record || typeof record !== 'object') {
    return record;
  }
  return {
    ...record,
    tags: Array.isArray(record.tags) ? [...record.tags] : [],
    sources: Array.isArray(record.sources) ? [...record.sources] : [],
  };
}

export class NewsService {
  constructor(store, clock = () => new Date()) {
    this.store = store;
    this.clock = clock;
  }

  async list({ category, tag, search, limit } = {}) {
    const records = await this.store.readAll();
    let filtered = records.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (category) {
      const validatedCategory = validateCategory(category);
      if (!validatedCategory) {
        throw createValidationError(
          `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
          'category',
        );
      }
      filtered = filtered.filter((item) => item.category === validatedCategory);
    }

    if (tag) {
      const validatedTag = validateTag(tag);
      if (!validatedTag) {
        throw createValidationError('Invalid tag format', 'tag');
      }
      filtered = filtered.filter((item) => item.tags?.includes(validatedTag));
    }

    if (search) {
      if (!isValidInput(search) || !isValidLength(search, 1, 100)) {
        throw createValidationError('Invalid search query', 'search');
      }
      const term = search.toLowerCase();
      filtered = filtered.filter((item) => {
        const haystacks = [item.title, item.excerpt, item.content]
          .filter(Boolean)
          .map((value) => value.toLowerCase());
        return haystacks.some((haystack) => haystack.includes(term));
      });
    }

    if (limit) {
      const numLimit = Number.parseInt(limit, 10);
      if (!Number.isInteger(numLimit) || numLimit < 1 || numLimit > 1000) {
        throw createValidationError('Invalid limit: must be between 1 and 1000', 'limit');
      }
      filtered = filtered.slice(0, numLimit);
    }

    return filtered;
  }

  async getById(id) {
    const records = await this.store.readAll();
    return records.find((item) => item.id === id) ?? null;
  }

  async create(payload) {
    assertPayloadObject(payload);
    this.#assertRequiredFields(payload);
    const sanitized = this.#validateCreatePayload(payload);

    const now = this.clock().toISOString();
    const record = {
      id: crypto.randomUUID(),
      ...sanitized,
      createdAt: now,
      updatedAt: now,
    };

    const records = await this.store.readAll();
    records.push(record);
    await this.store.writeAll(records);
    return record;
  }

  async update(id, payload) {
    assertPayloadObject(payload);
    const records = await this.store.readAll();
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    const existing = records[index];
    const updates = this.#validateUpdatePayload(payload, existing);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: this.clock().toISOString(),
    };

    records[index] = updated;
    await this.store.writeAll(records);
    return updated;
  }

  async analyticsSummary() {
    const records = await this.store.readAll();
    const categories = {};
    const tags = {};

    for (const item of records) {
      const category = item.category ?? DEFAULT_CATEGORY;
      categories[category] = (categories[category] ?? 0) + 1;

      if (Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          tags[tag] = (tags[tag] ?? 0) + 1;
        }
      }
    }

    const sorted = [...records].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const latest = sorted[0] ? cloneRecord(sorted[0]) : null;
    const recent = sorted.slice(0, 5).map(cloneRecord);

    return {
      total: records.length,
      categories,
      tags,
      latest,
      lastUpdatedAt: latest?.updatedAt ?? null,
      recent,
      generatedAt: this.clock().toISOString(),
    };
  }

  #assertRequiredFields(payload) {
    const missing = REQUIRED_FIELDS.filter((field) => {
      const value = payload[field];
      return typeof value !== 'string' || !value.trim();
    });
    if (missing.length) {
      throw createValidationError(`Missing required fields: ${missing.join(', ')}`, missing);
    }
  }

  #validateCreatePayload(payload) {
    const title = sanitizeHtml(validateTextField('Title', payload.title, 1, 200));
    const excerpt = sanitizeHtml(validateTextField('Excerpt', payload.excerpt, 1, 500));
    const content = sanitizeHtml(validateTextField('Content', payload.content, 1, 50000));

    return {
      title,
      excerpt,
      content,
      category: resolveCategory(payload.category),
      tags: sanitizeTagsInput(payload.tags),
      sources: sanitizeSourcesInput(payload.sources),
      author: sanitizeAuthor(payload.author),
      status: normalizeStatus(payload.status),
    };
  }

  #validateUpdatePayload(payload, existing) {
    const updates = {};

    if (payload.title !== undefined) {
      updates.title = sanitizeHtml(validateTextField('Title', payload.title, 1, 200));
    }

    if (payload.excerpt !== undefined) {
      updates.excerpt = sanitizeHtml(validateTextField('Excerpt', payload.excerpt, 1, 500));
    }

    if (payload.content !== undefined) {
      updates.content = sanitizeHtml(validateTextField('Content', payload.content, 1, 50000));
    }

    if (payload.category !== undefined) {
      updates.category = resolveCategory(payload.category);
    }

    if (payload.tags !== undefined) {
      updates.tags = sanitizeTagsInput(payload.tags);
    }

    if (payload.sources !== undefined) {
      updates.sources = sanitizeSourcesInput(payload.sources);
    }

    if (payload.author !== undefined) {
      updates.author = sanitizeAuthor(payload.author, existing.author);
    }

    if (payload.status !== undefined) {
      updates.status = normalizeStatus(payload.status);
    }

    return updates;
  }
}
