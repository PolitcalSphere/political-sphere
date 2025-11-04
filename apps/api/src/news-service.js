const {
	sanitizeHtml,
	isValidInput,
	isValidLength,
	validateCategory,
	validateTag,
	isValidUrl,
} = require("@political-sphere/shared");

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

const DEFAULT_CATEGORY = 'general';

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
      'category'
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
      fieldName.toLowerCase()
    );
  }
  if (!isValidInput(trimmed)) {
    throw createValidationError(
      `${fieldName} contains invalid characters or patterns`,
      fieldName.toLowerCase()
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
        'sources'
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
          'sources'
        );
      }
    }
    sanitized.push(parsed.toString());
  }

  return Array.from(new Set(sanitized));
}

class NewsService {
  constructor(store, nowFn = () => new Date()) {
    this.store = store;
    this.nowFn = nowFn;
  }

  async _readItems() {
    if (!this.store) return [];
    if (typeof this.store.read === 'function') return (await this.store.read()) || [];
    if (typeof this.store.getAll === 'function') return (await this.store.getAll()) || [];
    return [];
  }

  async _writeItems(items) {
    if (!this.store) throw new Error('No store configured');
    if (typeof this.store.write === 'function') return await this.store.write(items);
    if (typeof this.store.save === 'function') return await this.store.save(items);
    throw new Error('Store does not support write/save APIs');
  }

  _generateId(title = '') {
    const base =
      String(title || 'news')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'item';
    return `${base}-${Date.now().toString(36)}`;
  }

  _validateCreatePayload(payload = {}) {
    const hasTitle = typeof payload.title === 'string' && payload.title.trim().length > 0;
    const hasExcerpt = typeof payload.excerpt === 'string' && payload.excerpt.trim().length > 0;
    const hasContent = typeof payload.content === 'string' && payload.content.trim().length > 0;
    if (!hasTitle || !hasExcerpt || !hasContent) {
      throw createValidationError('Missing required fields', 'payload');
    }
  }

  // further structural and content validations are handled in create() to allow
  // sanitization and normalization prior to persistence

  async create(payload = {}) {
    this._validateCreatePayload(payload);
    // enforce stricter validations and sanitize inputs
    assertPayloadObject(payload);

    // title/excerpt/content
    const title = sanitizeHtml(validateTextField('Title', payload.title, 1, 200));
    const excerpt = sanitizeHtml(validateTextField('Excerpt', payload.excerpt, 1, 1000));
    const content = sanitizeHtml(validateTextField('Content', payload.content, 1, 20000));

    // category
    const category = resolveCategory(payload.category);

    // tags
    const tags = sanitizeTagsInput(payload.tags);

    // sources
    const sources = sanitizeSourcesInput(payload.sources);
    const items = (await this._readItems()) || [];
    const nowIso = this.nowFn().toISOString();

    const record = {
      id: payload.id || this._generateId(title),
      title,
      excerpt,
      content,
      category,
      tags,
      sources,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    items.push(record);
    await this._writeItems(items);
    return record;
  }

  async list(opts = {}) {
    const { category, tag, search, limit } = opts || {};
    let items = (await this._readItems()) || [];

    if (category) {
      // validate category
      resolveCategory(category);
      items = items.filter((i) => i.category === category);
    }

    if (tag) {
      // validate tag format
      const validatedTag = validateTag(tag);
      if (!validatedTag) throw createValidationError('Invalid tag', 'tag');
      items = items.filter((i) => Array.isArray(i.tags) && i.tags.includes(validatedTag));
    }

    if (search) {
      // validate search input to avoid basic XSS/SQL patterns
      if (!isValidInput(search)) {
        throw createValidationError('Invalid search query', 'search');
      }
      const q = String(search).toLowerCase();
      items = items.filter(
        (i) =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.excerpt && i.excerpt.toLowerCase().includes(q)) ||
          (i.content && i.content.toLowerCase().includes(q))
      );
    }

    if (limit !== undefined) {
      const n = Number(limit);
      if (!Number.isFinite(n) || n < 0 || n > 1000) {
        throw createValidationError('Invalid limit', 'limit');
      }
      items = items.slice(0, n);
    }

    return items;
  }

  async update(id, changes = {}) {
    if (!id) return null;
    const items = (await this._readItems()) || [];
    const idx = items.findIndex((it) => it.id === id);
    if (idx === -1) return null;
    const existing = items[idx];
    const updated = {
      ...existing,
      ...changes,
      id: existing.id,
      updatedAt: this.nowFn().toISOString(),
    };
    items[idx] = updated;
    await this._writeItems(items);
    return updated;
  }

  async analyticsSummary() {
    const items = (await this._readItems()) || [];
    const total = items.length;
    const categories = items.reduce((acc, it) => {
      if (it.category) acc[it.category] = (acc[it.category] || 0) + 1;
      return acc;
    }, {});
    const recent = items
      .slice()
      .filter((i) => i.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { total, categories, recent };
  }
}

module.exports = {
	NewsService,
};
