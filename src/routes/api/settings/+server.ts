import type { RequestHandler } from './$types';
import { getDb, settings } from '$lib/db';
import { eq } from 'drizzle-orm';
import { success, failure, parseBody, now } from '$lib/api/utils';
import type { NewSetting } from '$lib/db/schema';

// Default settings configuration
const DEFAULT_SETTINGS: Record<string, { value: string; category: string }> = {
  // API Keys
  'api.anthropicKey': { value: '', category: 'api' },
  'api.openaiKey': { value: '', category: 'api' },

  // Default Book Settings
  'defaults.bookType': { value: 'picture', category: 'defaults' },
  'defaults.targetAge': { value: '3-5', category: 'defaults' },
  'defaults.trimSize': { value: '8.5x8.5', category: 'defaults' },
  'defaults.pageCount': { value: '24', category: 'defaults' },

  // Illustration Defaults
  'defaults.illustrationStyle': { value: 'watercolor', category: 'defaults' },
  'defaults.illustrationQuality': { value: 'high', category: 'defaults' },

  // Export Defaults
  'export.paperType': { value: 'white', category: 'export' },
  'export.includeBleed': { value: 'true', category: 'export' },
  'export.colorMode': { value: 'color', category: 'export' },

  // UI Preferences
  'ui.theme': { value: 'light', category: 'ui' },
  'ui.compactView': { value: 'false', category: 'ui' },
  'ui.showTips': { value: 'true', category: 'ui' }
};

/**
 * GET /api/settings - Get all settings or by category
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const db = getDb();
    const category = url.searchParams.get('category');

    let allSettings = await db.select().from(settings);

    if (category) {
      allSettings = allSettings.filter(s => s.category === category);
    }

    // Merge with defaults to ensure all settings exist
    const settingsMap: Record<string, any> = {};

    // First apply defaults
    for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
      if (!category || config.category === category) {
        settingsMap[key] = {
          key,
          value: config.value,
          category: config.category,
          isDefault: true
        };
      }
    }

    // Then override with actual values
    for (const setting of allSettings) {
      settingsMap[setting.key] = {
        ...setting,
        isDefault: false
      };
    }

    return success(Object.values(settingsMap));
  } catch (err) {
    console.error('Error fetching settings:', err);
    return failure('Failed to fetch settings', 500);
  }
};

/**
 * POST /api/settings - Update multiple settings at once
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<Record<string, string>>(request);
    if (!body) {
      return failure('Invalid JSON body');
    }

    const db = getDb();
    const timestamp = now();
    const results: any[] = [];

    for (const [key, value] of Object.entries(body)) {
      // Validate key exists in defaults
      if (!DEFAULT_SETTINGS[key]) {
        continue; // Skip unknown keys
      }

      const category = DEFAULT_SETTINGS[key].category;

      // Upsert the setting
      const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

      if (existing.length > 0) {
        await db.update(settings).set({ value, updatedAt: timestamp }).where(eq(settings.key, key));
      } else {
        const newSetting: NewSetting = {
          key,
          value,
          category,
          updatedAt: timestamp
        };
        await db.insert(settings).values(newSetting);
      }

      results.push({ key, value, category });
    }

    return success(results);
  } catch (err) {
    console.error('Error updating settings:', err);
    return failure('Failed to update settings', 500);
  }
};

/**
 * PUT /api/settings - Update a single setting
 */
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await parseBody<{ key: string; value: string }>(request);
    if (!body || !body.key) {
      return failure('Invalid JSON body - key required');
    }

    const { key, value } = body;

    // Validate key exists in defaults
    if (!DEFAULT_SETTINGS[key]) {
      return failure(`Unknown setting key: ${key}`, 400);
    }

    const db = getDb();
    const timestamp = now();
    const category = DEFAULT_SETTINGS[key].category;

    // Upsert the setting
    const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

    if (existing.length > 0) {
      await db.update(settings).set({ value, updatedAt: timestamp }).where(eq(settings.key, key));
    } else {
      const newSetting: NewSetting = {
        key,
        value,
        category,
        updatedAt: timestamp
      };
      await db.insert(settings).values(newSetting);
    }

    const updated = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

    return success(updated[0]);
  } catch (err) {
    console.error('Error updating setting:', err);
    return failure('Failed to update setting', 500);
  }
};
