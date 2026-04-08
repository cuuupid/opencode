import z from "zod"
import { Tool } from "./tool"
import DESCRIPTION from "./remember.txt"
import { Memory } from "../memory"

export const RememberTool = Tool.define("remember", {
  description: DESCRIPTION,
  parameters: z.object({
    content: z.string().describe("Full detailed memory content"),
    summary: z.string().describe("Brief 1-line summary"),
    tags: z.array(z.string()).describe("Short categorization tags"),
    days: z.number().optional().describe("Days before decay (default: 30)"),
  }),
  async execute(params, ctx) {
    const id = Memory.addEidetic({
      content: params.content,
      summary: params.summary,
      tags: params.tags,
      days: params.days,
      session: ctx.sessionID,
    })
    return {
      title: params.summary,
      output: `Saved memory: ${params.summary} (decays in ${params.days ?? 30} days)`,
      metadata: { id },
    }
  },
})
