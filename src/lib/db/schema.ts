import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// SERIES - Group related books together
// ============================================================================
export const series = sqliteTable('series', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  targetAge: text('target_age'), // '0-2', '3-5', '5-8', '8-12'
  genre: text('genre'),
  keywords: text('keywords'), // JSON array
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// CHARACTERS - Reusable across books in a series
// ============================================================================
export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  seriesId: text('series_id').references(() => series.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(), // Detailed for AI prompts
  visualDescription: text('visual_description').notNull(), // For image generation
  personality: text('personality'),
  role: text('role'), // 'protagonist', 'sidekick', 'antagonist', 'supporting'
  referenceImagePath: text('reference_image_path'), // Path to stored reference image
  referenceImagePrompt: text('reference_image_prompt'), // Prompt used to generate reference
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// BOOKS - The main entity
// ============================================================================
export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  seriesId: text('series_id').references(() => series.id, { onDelete: 'set null' }),

  // Basic info
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  bookType: text('book_type').notNull(), // 'picture', 'board', 'early_reader', 'activity', 'coloring'
  targetAge: text('target_age').notNull(), // '0-2', '3-5', '5-8', '8-12'

  // Content
  concept: text('concept'), // Initial idea/theme
  outline: text('outline'), // JSON structure of chapters/pages
  manuscript: text('manuscript'), // Full text content as JSON

  // KDP specs
  trimSize: text('trim_size').default('8.5x8.5'), // '6x9', '8x10', '8.5x8.5', etc.
  pageCount: integer('page_count'),
  interiorType: text('interior_type').default('color'), // 'color', 'black_white'

  // Status tracking
  status: text('status').default('draft'), // 'draft', 'writing', 'illustrating', 'review', 'exported', 'published'
  currentStep: integer('current_step').default(1),

  // Publishing info
  asin: text('asin'), // Amazon ID after publishing
  publishedAt: integer('published_at', { mode: 'timestamp' }),

  // Metadata
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// PAGES - Individual pages within a book
// ============================================================================
export const pages = sqliteTable('pages', {
  id: text('id').primaryKey(),
  bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),

  pageNumber: integer('page_number').notNull(),
  pageType: text('page_type').default('content'), // 'cover', 'title', 'copyright', 'dedication', 'content', 'back_cover'

  // Content
  text: text('text'),
  textFormatted: text('text_formatted'), // With formatting/markdown

  // Illustration
  illustrationPrompt: text('illustration_prompt'),
  illustrationPath: text('illustration_path'),
  illustrationStyle: text('illustration_style'),

  // Layout
  layout: text('layout').default('text_bottom'), // 'full_bleed', 'text_top', 'text_bottom', 'text_left', 'text_right', 'text_overlay'

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// BOOK_CHARACTERS - Many-to-many relationship
// ============================================================================
export const bookCharacters = sqliteTable('book_characters', {
  id: text('id').primaryKey(),
  bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  characterId: text('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' })
});

// ============================================================================
// NICHES - Track niche research and ideas
// ============================================================================
export const niches = sqliteTable('niches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'), // KDP category
  keywords: text('keywords'), // JSON array
  competitionLevel: text('competition_level'), // 'low', 'medium', 'high'
  demandLevel: text('demand_level'), // 'low', 'medium', 'high'
  notes: text('notes'),
  bookIdeas: text('book_ideas'), // JSON array of potential book concepts
  researched: integer('researched', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// LISTINGS - KDP listing information
// ============================================================================
export const listings = sqliteTable('listings', {
  id: text('id').primaryKey(),
  bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),

  // Generated content
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  description: text('description'), // HTML formatted for KDP
  keywords: text('keywords'), // JSON array of 7 keywords
  categories: text('categories'), // JSON array of BISAC codes

  // Pricing
  listPrice: real('list_price'),
  currency: text('currency').default('USD'),

  // Status
  status: text('status').default('draft'), // 'draft', 'ready', 'submitted'

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// EXPORTS - Track PDF exports
// ============================================================================
export const exports = sqliteTable('exports', {
  id: text('id').primaryKey(),
  bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),

  exportType: text('export_type').notNull(), // 'interior', 'cover', 'full'
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),

  // KDP specs used
  trimSize: text('trim_size'),
  bleed: integer('bleed', { mode: 'boolean' }),
  colorSpace: text('color_space'), // 'RGB', 'CMYK'

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// PUBLISH_LOG - Track published books and performance notes
// ============================================================================
export const publishLog = sqliteTable('publish_log', {
  id: text('id').primaryKey(),
  bookId: text('book_id').references(() => books.id, { onDelete: 'set null' }),

  // Amazon info
  asin: text('asin'),
  publishedDate: integer('published_date', { mode: 'timestamp' }),

  // Performance tracking (manual entry)
  salesRank: integer('sales_rank'),
  reviewCount: integer('review_count'),
  averageRating: real('average_rating'),
  notes: text('notes'),

  // For AI marketing agent later
  marketingNotes: text('marketing_notes'),
  lessonsLearned: text('lessons_learned'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// RELATIONS
// ============================================================================
export const seriesRelations = relations(series, ({ many }) => ({
  books: many(books),
  characters: many(characters)
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  series: one(series, {
    fields: [characters.seriesId],
    references: [series.id]
  }),
  bookCharacters: many(bookCharacters)
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  series: one(series, {
    fields: [books.seriesId],
    references: [series.id]
  }),
  pages: many(pages),
  bookCharacters: many(bookCharacters),
  listings: many(listings),
  exports: many(exports),
  publishLogs: many(publishLog)
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  book: one(books, {
    fields: [pages.bookId],
    references: [books.id]
  })
}));

export const bookCharactersRelations = relations(bookCharacters, ({ one }) => ({
  book: one(books, {
    fields: [bookCharacters.bookId],
    references: [books.id]
  }),
  character: one(characters, {
    fields: [bookCharacters.characterId],
    references: [characters.id]
  })
}));

export const listingsRelations = relations(listings, ({ one }) => ({
  book: one(books, {
    fields: [listings.bookId],
    references: [books.id]
  })
}));

export const exportsRelations = relations(exports, ({ one }) => ({
  book: one(books, {
    fields: [exports.bookId],
    references: [books.id]
  })
}));

export const publishLogRelations = relations(publishLog, ({ one }) => ({
  book: one(books, {
    fields: [publishLog.bookId],
    references: [books.id]
  })
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type Series = typeof series.$inferSelect;
export type NewSeries = typeof series.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type Niche = typeof niches.$inferSelect;
export type NewNiche = typeof niches.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type Export = typeof exports.$inferSelect;
export type NewExport = typeof exports.$inferInsert;
export type PublishLogEntry = typeof publishLog.$inferSelect;
export type NewPublishLogEntry = typeof publishLog.$inferInsert;
