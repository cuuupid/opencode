import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { SessionID } from "./schema"
import { Database, eq, asc } from "../storage/db"
import { ChangelogTable } from "./session.sql"
import z from "zod"

export namespace Changelog {
  export const Entry = z
    .object({
      category: z.enum(["fix", "change"]).describe("Whether this is a fix or a change"),
      description: z.string().describe("Short description of what was done (5-12 words)"),
    })
    .meta({ ref: "ChangelogEntry" })
  export type Entry = z.infer<typeof Entry>

  export const Event = {
    Updated: BusEvent.define(
      "changelog.updated",
      z.object({
        sessionID: SessionID.zod,
        entries: z.array(Entry),
      }),
    ),
  }

  export function log(input: { sessionID: SessionID; entry: Entry }) {
    const entries = get(input.sessionID)
    const position = entries.length
    Database.use((db) =>
      db
        .insert(ChangelogTable)
        .values({
          session_id: input.sessionID,
          position,
          category: input.entry.category,
          description: input.entry.description,
        })
        .run(),
    )
    Bus.publish(Event.Updated, { sessionID: input.sessionID, entries: [...entries, input.entry] })
  }

  export function get(sessionID: SessionID): Entry[] {
    return Database.use((db) =>
      db
        .select()
        .from(ChangelogTable)
        .where(eq(ChangelogTable.session_id, sessionID))
        .orderBy(asc(ChangelogTable.position))
        .all()
        .map((row) => ({
          category: row.category as "fix" | "change",
          description: row.description,
        })),
    )
  }
}
