export function summarizeNews(items) {
  const safeItems = Array.isArray(items) ? items : [];

  const categories = {};
  const tags = {};

  for (const item of safeItems) {
    const category = item?.category ?? 'general';
    categories[category] = (categories[category] ?? 0) + 1;

    if (Array.isArray(item?.tags)) {
      for (const tag of item.tags) {
        if (!tag) continue;
        tags[tag] = (tags[tag] ?? 0) + 1;
      }
    }
  }

  const latest = [...safeItems]
    .filter((item) => Boolean(item?.updatedAt))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] ?? null;

  return {
    total: safeItems.length,
    categories,
    tags,
    latest: latest
      ? { id: latest.id, title: latest.title, updatedAt: latest.updatedAt }
      : null,
    generatedAt: new Date().toISOString(),
  };
}
