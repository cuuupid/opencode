import z from "zod"
import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { Database, eq, and, desc, asc, lte, like } from "../storage/db"
import { MemoryRuleTable, MemoryEideticTable, MemoryCatalogTable } from "./memory.sql"
import { Instance } from "../project/instance"
import { Log } from "../util/log"
import { Identifier } from "@/id/id"

export namespace Memory {
  const log = Log.create({ service: "memory" })

  function id() {
    return Identifier.create("memory", false)
  }

  // ─── Schemas ───

  export const Rule = z
    .object({
      id: z.string(),
      content: z.string(),
      tag: z.string().optional(),
      position: z.number(),
    })
    .meta({ ref: "MemoryRule" })
  export type Rule = z.infer<typeof Rule>

  export const Eidetic = z
    .object({
      id: z.string(),
      content: z.string(),
      summary: z.string(),
      tags: z.array(z.string()),
      relevance: z.number(),
      decay: z.number().describe("Unix timestamp when this memory fully decays"),
      session: z.string().optional(),
    })
    .meta({ ref: "MemoryEidetic" })
  export type Eidetic = z.infer<typeof Eidetic>

  export const Catalog = z
    .object({
      id: z.string(),
      wing: z.string(),
      room: z.string(),
      hall: z.string(),
      content: z.string(),
      compressed: z.string().optional(),
      tags: z.array(z.string()),
      session: z.string().optional(),
    })
    .meta({ ref: "MemoryCatalog" })
  export type Catalog = z.infer<typeof Catalog>

  // ─── Halls (memory types) ───

  export const HALLS = ["facts", "events", "discoveries", "preferences", "advice"] as const
  export type Hall = (typeof HALLS)[number]

  // ─── Events ───

  export const Event = {
    RuleUpdated: BusEvent.define("memory.rule.updated", z.object({})),
    EideticUpdated: BusEvent.define("memory.eidetic.updated", z.object({})),
    CatalogUpdated: BusEvent.define("memory.catalog.updated", z.object({})),
  }

  // ─── Rules ───

  export function listRules() {
    return Database.use((db) =>
      db
        .select()
        .from(MemoryRuleTable)
        .where(eq(MemoryRuleTable.project_id, Instance.project.id))
        .orderBy(asc(MemoryRuleTable.position))
        .all()
        .map((row) => ({
          id: row.id,
          content: row.content,
          tag: row.tag ?? undefined,
          position: row.position,
        })),
    )
  }

  export function addRule(input: { content: string; tag?: string }) {
    const rules = listRules()
    const position = rules.length
    const entry = {
      id: id(),
      project_id: Instance.project.id,
      content: input.content,
      tag: input.tag ?? null,
      position,
    }
    Database.use((db) => db.insert(MemoryRuleTable).values(entry).run())
    log.info("rule added", { id: entry.id })
    Bus.publish(Event.RuleUpdated, {})
    return entry.id
  }

  export function removeRule(rid: string) {
    Database.use((db) =>
      db
        .delete(MemoryRuleTable)
        .where(and(eq(MemoryRuleTable.id, rid), eq(MemoryRuleTable.project_id, Instance.project.id)))
        .run(),
    )
    log.info("rule removed", { id: rid })
    Bus.publish(Event.RuleUpdated, {})
  }

  export function updateRule(rid: string, input: { content?: string; tag?: string }) {
    const set: Record<string, unknown> = {}
    if (input.content !== undefined) set.content = input.content
    if (input.tag !== undefined) set.tag = input.tag
    Database.use((db) =>
      db
        .update(MemoryRuleTable)
        .set(set)
        .where(and(eq(MemoryRuleTable.id, rid), eq(MemoryRuleTable.project_id, Instance.project.id)))
        .run(),
    )
    Bus.publish(Event.RuleUpdated, {})
  }

  // ─── Eidetic ───

  const DAY = 86400000
  const DEFAULT_DECAY_DAYS = 30

  export function listEidetic(input?: { active?: boolean; limit?: number }) {
    const conditions = [eq(MemoryEideticTable.project_id, Instance.project.id)]
    if (input?.active) {
      conditions.push(lte(MemoryEideticTable.time_decay, Date.now() + DAY * 365))
    }
    return Database.use((db) =>
      db
        .select()
        .from(MemoryEideticTable)
        .where(and(...conditions))
        .orderBy(desc(MemoryEideticTable.relevance))
        .limit(input?.limit ?? 50)
        .all()
        .map((row) => ({
          id: row.id,
          content: row.content,
          summary: row.summary,
          tags: row.tags,
          relevance: decayedRelevance(row.relevance, row.time_decay),
          decay: row.time_decay,
          session: row.session_id ?? undefined,
        })),
    )
  }

  function decayedRelevance(base: number, decay: number) {
    const now = Date.now()
    if (now >= decay) return 0
    const remaining = (decay - now) / DAY
    const total = DEFAULT_DECAY_DAYS
    return Math.max(0, base * Math.min(1, remaining / total))
  }

  export function addEidetic(input: {
    content: string
    summary: string
    tags?: string[]
    relevance?: number
    days?: number
    session?: string
  }) {
    const entry = {
      id: id(),
      project_id: Instance.project.id,
      content: input.content,
      summary: input.summary,
      tags: input.tags ?? [],
      relevance: input.relevance ?? 1.0,
      time_decay: Date.now() + (input.days ?? DEFAULT_DECAY_DAYS) * DAY,
      session_id: input.session ?? null,
    }
    Database.use((db) => db.insert(MemoryEideticTable).values(entry).run())
    log.info("eidetic added", { id: entry.id, summary: input.summary })
    Bus.publish(Event.EideticUpdated, {})
    return entry.id
  }

  export function removeEidetic(eid: string) {
    Database.use((db) =>
      db
        .delete(MemoryEideticTable)
        .where(and(eq(MemoryEideticTable.id, eid), eq(MemoryEideticTable.project_id, Instance.project.id)))
        .run(),
    )
    Bus.publish(Event.EideticUpdated, {})
  }

  export function refreshEidetic(eid: string, days?: number) {
    Database.use((db) =>
      db
        .update(MemoryEideticTable)
        .set({ time_decay: Date.now() + (days ?? DEFAULT_DECAY_DAYS) * DAY })
        .where(and(eq(MemoryEideticTable.id, eid), eq(MemoryEideticTable.project_id, Instance.project.id)))
        .run(),
    )
    Bus.publish(Event.EideticUpdated, {})
  }

  // ─── Catalog ───

  export function listCatalog(input?: { wing?: string; room?: string; hall?: string; limit?: number }) {
    const conditions = [eq(MemoryCatalogTable.project_id, Instance.project.id)]
    if (input?.wing) conditions.push(eq(MemoryCatalogTable.wing, input.wing))
    if (input?.room) conditions.push(eq(MemoryCatalogTable.room, input.room))
    if (input?.hall) conditions.push(eq(MemoryCatalogTable.hall, input.hall))
    return Database.use((db) =>
      db
        .select()
        .from(MemoryCatalogTable)
        .where(and(...conditions))
        .orderBy(desc(MemoryCatalogTable.time_created))
        .limit(input?.limit ?? 100)
        .all()
        .map((row) => ({
          id: row.id,
          wing: row.wing,
          room: row.room,
          hall: row.hall,
          content: row.content,
          compressed: row.compressed ?? undefined,
          tags: row.tags,
          session: row.session_id ?? undefined,
        })),
    )
  }

  export function searchEidetic(query: string, limit = 10): Eidetic[] {
    return listEidetic({ active: true, limit: 50 })
      .filter(
        (m) =>
          m.relevance > 0.1 &&
          (m.content.toLowerCase().includes(query.toLowerCase()) ||
            m.summary.toLowerCase().includes(query.toLowerCase()) ||
            m.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))),
      )
      .slice(0, limit)
  }

  export function searchCatalog(query: string, input?: { wing?: string; limit?: number }) {
    const conditions = [
      eq(MemoryCatalogTable.project_id, Instance.project.id),
      like(MemoryCatalogTable.content, `%${query}%`),
    ]
    if (input?.wing) conditions.push(eq(MemoryCatalogTable.wing, input.wing))
    return Database.use((db) =>
      db
        .select()
        .from(MemoryCatalogTable)
        .where(and(...conditions))
        .orderBy(desc(MemoryCatalogTable.time_created))
        .limit(input?.limit ?? 20)
        .all()
        .map((row) => ({
          id: row.id,
          wing: row.wing,
          room: row.room,
          hall: row.hall,
          content: row.content,
          compressed: row.compressed ?? undefined,
          tags: row.tags,
          session: row.session_id ?? undefined,
        })),
    )
  }

  export function addCatalog(input: {
    wing: string
    room: string
    hall: string
    content: string
    compressed?: string
    tags?: string[]
    session?: string
  }) {
    const entry = {
      id: id(),
      project_id: Instance.project.id,
      wing: input.wing,
      room: input.room,
      hall: input.hall,
      content: input.content,
      compressed: input.compressed ?? null,
      tags: input.tags ?? [],
      session_id: input.session ?? null,
    }
    Database.use((db) => db.insert(MemoryCatalogTable).values(entry).run())
    log.info("catalog added", { id: entry.id, wing: input.wing, room: input.room })
    Bus.publish(Event.CatalogUpdated, {})
    return entry.id
  }

  export function removeCatalog(cid: string) {
    Database.use((db) =>
      db
        .delete(MemoryCatalogTable)
        .where(and(eq(MemoryCatalogTable.id, cid), eq(MemoryCatalogTable.project_id, Instance.project.id)))
        .run(),
    )
    Bus.publish(Event.CatalogUpdated, {})
  }

  // ─── Prompt injection helpers ───

  export function rulesPrompt(): string {
    const rules = listRules()
    if (rules.length === 0) return ""
    const lines = rules.map((r) => (r.tag ? `[${r.tag}] ${r.content}` : r.content))
    return `<memory-rules>\n${lines.join("\n")}\n</memory-rules>`
  }

  export function eideticPrompt(limit = 10): string {
    const memories = listEidetic({ active: true, limit }).filter((m) => m.relevance > 0.1)
    if (memories.length === 0) return ""
    const lines = memories.map((m) => `[${m.tags.join(",")}] (relevance:${m.relevance.toFixed(1)}) ${m.summary}`)
    return `<memory-eidetic>\n${lines.join("\n")}\n</memory-eidetic>`
  }

  export function catalogPrompt(limit = 20): string {
    const entries = listCatalog({ limit })
    if (entries.length === 0) return ""
    const grouped = new Map<string, string[]>()
    for (const e of entries) {
      const key = `${e.wing}/${e.room}`
      const list = grouped.get(key) ?? []
      // Truncate long entries to keep prompt compact
      const text = e.content.length > 120 ? e.content.slice(0, 117) + "..." : e.content
      list.push(`(${e.hall}) ${text}`)
      grouped.set(key, list)
    }
    const sections: string[] = []
    for (const [key, items] of grouped) {
      sections.push(`[${key}]\n${items.join("\n")}`)
    }
    return `<memory-catalog>\nUse the recall tool to search for more detail on any of these.\n${sections.join("\n\n")}\n</memory-catalog>`
  }

  // ─── Compaction extraction ───

  /** Extract knowledge from a compaction summary into catalog memories */
  export function extractFromCompaction(input: { sessionID: string; summary: string; wing?: string }) {
    const wing = input.wing ?? Instance.project.name ?? "general"
    const sections: { hall: string; pattern: RegExp }[] = [
      { hall: "facts", pattern: /## (?:Goal|Instructions)\s*\n([\s\S]*?)(?=\n## |\n---|\Z)/g },
      { hall: "discoveries", pattern: /## Discoveries\s*\n([\s\S]*?)(?=\n## |\n---|\Z)/g },
      { hall: "events", pattern: /## Accomplished\s*\n([\s\S]*?)(?=\n## |\n---|\Z)/g },
    ]

    for (const { hall, pattern } of sections) {
      let match
      while ((match = pattern.exec(input.summary)) !== null) {
        const content = match[1].trim()
        if (!content || content.length < 20) continue

        // Extract bullet points as individual memories
        const lines = content.split("\n").filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*"))
        if (lines.length > 0) {
          for (const line of lines) {
            const text = line.replace(/^[\s\-*]+/, "").trim()
            if (text.length < 10) continue
            addCatalog({
              wing,
              room: "compaction",
              hall,
              content: text,
              tags: ["compaction"],
              session: input.sessionID,
            })
          }
        } else if (content.length > 20) {
          addCatalog({
            wing,
            room: "compaction",
            hall,
            content,
            tags: ["compaction"],
            session: input.sessionID,
          })
        }
      }
    }
    log.info("extracted from compaction", { wing, session: input.sessionID })
  }

  // ─── Correction ───

  /** Find and update eidetic memories matching a query, replacing content */
  export function correct(input: { query: string; old: string; new: string }) {
    const matches = searchEidetic(input.query, 50)
    let corrected = 0
    for (const mem of matches) {
      if (mem.content.includes(input.old) || mem.summary.includes(input.old)) {
        const updated = {
          content: mem.content.replace(input.old, input.new),
          summary: mem.summary.replace(input.old, input.new),
        }
        Database.use((db) =>
          db
            .update(MemoryEideticTable)
            .set({ content: updated.content, summary: updated.summary })
            .where(eq(MemoryEideticTable.id, mem.id))
            .run(),
        )
        corrected++
      }
    }
    if (corrected > 0) {
      log.info("corrected memories", { count: corrected, query: input.query })
      Bus.publish(Event.EideticUpdated, {})
    }
    return corrected
  }
}
