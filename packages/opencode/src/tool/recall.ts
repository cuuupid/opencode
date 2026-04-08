import z from "zod"
import { Tool } from "./tool"
import DESCRIPTION from "./recall.txt"
import { Memory } from "../memory"

export const RecallTool = Tool.define("recall", {
  description: DESCRIPTION,
  parameters: z.object({
    query: z.string().describe("What to search for"),
    wing: z.string().optional().describe("Filter by wing (project/person)"),
  }),
  async execute(params) {
    const catalog = Memory.searchCatalog(params.query, { wing: params.wing })
    const eidetic = Memory.searchEidetic(params.query)
    const parts: string[] = []
    if (eidetic.length > 0) {
      parts.push(
        "## Eidetic memories\n" +
          eidetic.map((m) => `[${m.tags.join(",")}] (relevance:${m.relevance.toFixed(1)}) ${m.content}`).join("\n"),
      )
    }
    if (catalog.length > 0) {
      parts.push(
        "## Catalog memories\n" + catalog.map((r) => `[${r.wing}/${r.room}] (${r.hall}) ${r.content}`).join("\n"),
      )
    }
    const count = eidetic.length + catalog.length
    if (count === 0) {
      return {
        title: `No memories found for "${params.query}"`,
        output: "No matching memories.",
        metadata: { count: 0 },
      }
    }
    return {
      title: `${count} memories found`,
      output: parts.join("\n\n"),
      metadata: { count },
    }
  },
})
