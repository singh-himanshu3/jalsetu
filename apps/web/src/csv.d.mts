export function parseCsv(text: string): Record<string, string>[];
export function csvCell(value: unknown): string;
export function encodeCsv(rows: unknown[][]): string;
export function mergeSiteCsv<T extends Record<string, unknown>>(sites: T[], text: string): T[];
