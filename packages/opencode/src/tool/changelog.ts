import z from "zod"
import { Tool } from "./tool"
import DESCRIPTION from "./changelog.txt"
import { Changelog } from "../session/changelog"

export const ChangelogTool = Tool.define("log_change", {
  description: DESCRIPTION,
  parameters: z.object({
    category: z.enum(["fix", "change"]).describe("Whether this is a fix or a change"),
    description: z.string().describe("Short description (5-12 words)"),
  }),
  async execute(params, ctx) {
    Changelog.log({
      sessionID: ctx.sessionID,
      entry: { category: params.category, description: params.description },
    })
    return {
      title: `${params.category}: ${params.description}`,
      output: `Logged ${params.category}: ${params.description}`,
      metadata: {},
    }
  },
})
