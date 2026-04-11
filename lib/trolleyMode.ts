// Shared in-memory store for per-trolley scan mode.
// Uses Node.js global so the Map is shared across all route module instances
// (Next.js Turbopack can give each route handler its own module context).
// Default mode for any trolley not in the Map is 'ADD'.

export type ScanMode = 'ADD' | 'REMOVE'

// Attach to global to survive module re-instantiation across route workers
declare global {
  // eslint-disable-next-line no-var
  var __trolleyModes: Map<string, ScanMode> | undefined
}

if (!global.__trolleyModes) {
  global.__trolleyModes = new Map<string, ScanMode>()
}

export function getMode(trolleyId: string): ScanMode {
  return global.__trolleyModes!.get(trolleyId) ?? 'ADD'
}

export function setMode(trolleyId: string, mode: ScanMode): void {
  global.__trolleyModes!.set(trolleyId, mode)
}
