import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { Memory } from "../../memory"
import { errors } from "../error"
import { lazy } from "../../util/lazy"

export const MemoryRoutes = lazy(() =>
  new Hono()
    // ─── Rules ───
    .get(
      "/rule",
      describeRoute({
        summary: "List memory rules",
        operationId: "memory.rule.list",
        responses: {
          200: {
            description: "List of rules",
            content: { "application/json": { schema: resolver(z.array(Memory.Rule)) } },
          },
        },
      }),
      (c) => c.json(Memory.listRules()),
    )
    .post(
      "/rule",
      describeRoute({
        summary: "Add a memory rule",
        operationId: "memory.rule.add",
        responses: {
          200: {
            description: "Rule ID",
            content: { "application/json": { schema: resolver(z.string()) } },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          content: z.string(),
          tag: z.string().optional(),
        }),
      ),
      (c) => c.json(Memory.addRule(c.req.valid("json"))),
    )
    .delete(
      "/rule/:id",
      describeRoute({
        summary: "Remove a memory rule",
        operationId: "memory.rule.remove",
        responses: {
          200: {
            description: "Success",
            content: { "application/json": { schema: resolver(z.boolean()) } },
          },
          ...errors(404),
        },
      }),
      validator("param", z.object({ id: z.string() })),
      (c) => {
        Memory.removeRule(c.req.valid("param").id)
        return c.json(true)
      },
    )
    .patch(
      "/rule/:id",
      describeRoute({
        summary: "Update a memory rule",
        operationId: "memory.rule.update",
        responses: {
          200: {
            description: "Success",
            content: { "application/json": { schema: resolver(z.boolean()) } },
          },
          ...errors(400, 404),
        },
      }),
      validator("param", z.object({ id: z.string() })),
      validator(
        "json",
        z.object({
          content: z.string().optional(),
          tag: z.string().optional(),
        }),
      ),
      (c) => {
        Memory.updateRule(c.req.valid("param").id, c.req.valid("json"))
        return c.json(true)
      },
    )
    // ─── Eidetic ───
    .get(
      "/eidetic",
      describeRoute({
        summary: "List eidetic memories",
        operationId: "memory.eidetic.list",
        responses: {
          200: {
            description: "List of eidetic memories",
            content: { "application/json": { schema: resolver(z.array(Memory.Eidetic)) } },
          },
        },
      }),
      (c) => c.json(Memory.listEidetic({ active: true })),
    )
    .post(
      "/eidetic",
      describeRoute({
        summary: "Add an eidetic memory",
        operationId: "memory.eidetic.add",
        responses: {
          200: {
            description: "Memory ID",
            content: { "application/json": { schema: resolver(z.string()) } },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          content: z.string(),
          summary: z.string(),
          tags: z.array(z.string()).optional(),
          relevance: z.number().optional(),
          days: z.number().optional(),
          session: z.string().optional(),
        }),
      ),
      (c) => c.json(Memory.addEidetic(c.req.valid("json"))),
    )
    .delete(
      "/eidetic/:id",
      describeRoute({
        summary: "Remove an eidetic memory",
        operationId: "memory.eidetic.remove",
        responses: {
          200: {
            description: "Success",
            content: { "application/json": { schema: resolver(z.boolean()) } },
          },
        },
      }),
      validator("param", z.object({ id: z.string() })),
      (c) => {
        Memory.removeEidetic(c.req.valid("param").id)
        return c.json(true)
      },
    )
    // ─── Catalog ───
    .get(
      "/catalog",
      describeRoute({
        summary: "List catalog memories",
        operationId: "memory.catalog.list",
        responses: {
          200: {
            description: "List of catalog entries",
            content: { "application/json": { schema: resolver(z.array(Memory.Catalog)) } },
          },
        },
      }),
      validator(
        "query",
        z.object({
          wing: z.string().optional(),
          room: z.string().optional(),
          hall: z.string().optional(),
        }),
      ),
      (c) => c.json(Memory.listCatalog(c.req.valid("query"))),
    )
    .get(
      "/catalog/search",
      describeRoute({
        summary: "Search catalog memories",
        operationId: "memory.catalog.search",
        responses: {
          200: {
            description: "Search results",
            content: { "application/json": { schema: resolver(z.array(Memory.Catalog)) } },
          },
          ...errors(400),
        },
      }),
      validator(
        "query",
        z.object({
          q: z.string(),
          wing: z.string().optional(),
        }),
      ),
      (c) => {
        const query = c.req.valid("query")
        return c.json(Memory.searchCatalog(query.q, { wing: query.wing }))
      },
    )
    .post(
      "/catalog",
      describeRoute({
        summary: "Add a catalog memory",
        operationId: "memory.catalog.add",
        responses: {
          200: {
            description: "Memory ID",
            content: { "application/json": { schema: resolver(z.string()) } },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          wing: z.string(),
          room: z.string(),
          hall: z.string(),
          content: z.string(),
          compressed: z.string().optional(),
          tags: z.array(z.string()).optional(),
          session: z.string().optional(),
        }),
      ),
      (c) => c.json(Memory.addCatalog(c.req.valid("json"))),
    )
    .delete(
      "/catalog/:id",
      describeRoute({
        summary: "Remove a catalog memory",
        operationId: "memory.catalog.remove",
        responses: {
          200: {
            description: "Success",
            content: { "application/json": { schema: resolver(z.boolean()) } },
          },
        },
      }),
      validator("param", z.object({ id: z.string() })),
      (c) => {
        Memory.removeCatalog(c.req.valid("param").id)
        return c.json(true)
      },
    ),
)
