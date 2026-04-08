import { Schema } from "effect"

export const MemoryID = Schema.String.pipe(Schema.brand("MemoryID"))
export type MemoryID = Schema.Schema.Type<typeof MemoryID>
