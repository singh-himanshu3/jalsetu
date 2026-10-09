export const SCHEMA_VERSION = "1.0" as const;
export const STRATEGIES = ["equal_share", "demand_proportional", "greedy", "jalsetu"] as const;
export type Strategy = typeof STRATEGIES[number];
export type DataMode = "example" | "operator_entered" | "mixed";
export type JobStage = "queued" | "validating" | "routing" | "solving" | "checking" | "persisting" | "explaining" | "completed" | "failed";
export interface ApiError { error: { code: string; message: string; field?: string; correlation_id: string } }
// Pydantic exports the authoritative planner input JSON Schema.
// UI forms will validate against that generated schema rather than a second policy implementation.
