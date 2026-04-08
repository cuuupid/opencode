import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"
import { ProjectTable } from "../project/project.sql"
import type { ProjectID } from "../project/schema"

export const MemoryRuleTable = sqliteTable(
  "memory_rule",
  {
    id: text().primaryKey(),
    project_id: text()
      .$type<ProjectID>()
      .notNull()
      .references(() => ProjectTable.id, { onDelete: "cascade" }),
    content: text().notNull(),
    tag: text(),
    position: integer().notNull().default(0),
    ...Timestamps,
  },
  (table) => [index("memory_rule_project_idx").on(table.project_id)],
)

export const MemoryEideticTable = sqliteTable(
  "memory_eidetic",
  {
    id: text().primaryKey(),
    project_id: text()
      .$type<ProjectID>()
      .notNull()
      .references(() => ProjectTable.id, { onDelete: "cascade" }),
    content: text().notNull(),
    summary: text().notNull(),
    tags: text({ mode: "json" }).notNull().$type<string[]>(),
    relevance: real().notNull().default(1.0),
    time_decay: integer().notNull(),
    session_id: text(),
    ...Timestamps,
  },
  (table) => [
    index("memory_eidetic_project_idx").on(table.project_id),
    index("memory_eidetic_decay_idx").on(table.time_decay),
  ],
)

export const MemoryCatalogTable = sqliteTable(
  "memory_catalog",
  {
    id: text().primaryKey(),
    project_id: text()
      .$type<ProjectID>()
      .notNull()
      .references(() => ProjectTable.id, { onDelete: "cascade" }),
    wing: text().notNull(),
    room: text().notNull(),
    hall: text().notNull(),
    content: text().notNull(),
    compressed: text(),
    tags: text({ mode: "json" }).notNull().$type<string[]>(),
    session_id: text(),
    ...Timestamps,
  },
  (table) => [
    index("memory_catalog_project_idx").on(table.project_id),
    index("memory_catalog_wing_idx").on(table.wing),
    index("memory_catalog_room_idx").on(table.room),
    index("memory_catalog_hall_idx").on(table.hall),
  ],
)
