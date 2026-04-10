import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { SessionID } from "./schema"
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

  const store = new Map<string, Entry[]>()

  export function log(input: { sessionID: SessionID; entry: Entry }) {
    const list = store.get(input.sessionID) ?? []
    list.push(input.entry)
    store.set(input.sessionID, list)
    Bus.publish(Event.Updated, { sessionID: input.sessionID, entries: list })
  }

  export function get(sessionID: SessionID): Entry[] {
    return store.get(sessionID) ?? []
  }
}
