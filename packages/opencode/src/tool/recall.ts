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
    const results = Memory.searchCatalog(params.query, { wing: params.wing })
    if (results.length === 0) {
      return {
        title: `No memories found for "${params.query}"`,
        output: "No matching memories in the catalog.",
        metadata: { count: 0 },
      }
    }
    const formatted = results.map((r) => `[${r.wing}/${r.room}] (${r.hall}) ${r.content}`)
    return {
      title: `${results.length} memories found`,
      output: formatted.join("\n\n"),
      metadata: { count: results.length },
    }
  },
})
