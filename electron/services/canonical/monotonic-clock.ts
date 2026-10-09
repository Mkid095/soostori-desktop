/**
 * monotonic-clock.ts — Detect system-clock manipulation in Desktop.
 *
 * Threat: a shop owner with admin access can roll the system clock backward
 * to extend the 3-day offline grace window indefinitely. `Date.now()` and
 * `new Date().getTime()` are both manipulable.
 *
 * Defense:
 *   1. `firstLaunchAt` is persisted to electron-store on first boot. It
 *      cannot move without erasing the store. Used as a wall-clock floor.
 *   2. `performance.now()` (perf_hooks) is monotonic — immune to wall-clock
 *      changes. Use for elapsed-time deltas.
 *   3. `assertClockNotTampered()` throws `ClockTamperingError` when a
 *      timestamp is significantly before the configured first-launch floor.
 *
 * This module is deliberately pure (no electron-store import) so unit tests
 * can exercise it without booting Electron. The wall-clock floor is provided
 * by `setFirstLaunchFloorResolver()`, called once at app startup.
 *
 * Limitations: a determined attacker with root access can patch the
 * electron-store JSON or replace the binary. This guard stops casual
 * tampering (Settings → Date & Time) and forces a reset of the device.
 */

import { performance } from 'node:perf_hooks'

/** 60 s tolerance for NTP drift and DST shifts. Anything larger = tampering. */
export const CLOCK_TOLERANCE_MS = 60_000

export class ClockTamperingError extends Error {
  readonly code = 'CLOCK_TAMPERING_DETECTED' as const
  constructor(
    public readonly wallClockMs: number,
    public readonly firstLaunchMs: number,
  ) {
    super(
      `System clock manipulation detected. ` +
      `Wall clock ${new Date(wallClockMs).toISOString()} is before ` +
      `first-launch ${new Date(firstLaunchMs).toISOString()}. ` +
      `POS operations paused. Restore correct system clock.`,
    )
    this.name = 'ClockTamperingError'
  }
}

/** Pure check (both wall clock and floor in ms). Returns true if rolled back. */
export function isClockTampered(wallClockMs: number, firstLaunchMs: number): boolean {
  return wallClockMs < firstLaunchMs - CLOCK_TOLERANCE_MS
}

/** Pure assertion. Throws ClockTamperingError if the clock is rolled back. */
export function assertClockNotTamperedWith(
  wallClockMs: number,
  firstLaunchMs: number,
): void {
  if (isClockTampered(wallClockMs, firstLaunchMs)) {
    throw new ClockTamperingError(wallClockMs, firstLaunchMs)
  }
}

/** Monotonic elapsed milliseconds since process start. Immune to wall clock. */
export function monotonicElapsedMs(): number {
  return performance.now()
}

type FloorResolver = () => number
let _floorResolver: FloorResolver | null = null

/**
 * Configure the resolver used by `assertClockNotTampered()` (no-arg form).
 * Called once at app startup from `store.ts`. Until set, the no-arg form
 * defaults to using `Date.now()` as the floor (safe in tests).
 */
export function setFirstLaunchFloorResolver(resolver: FloorResolver): void {
  _floorResolver = resolver
}

/**
 * Convenience assertion. Reads the first-launch floor from the configured
 * resolver, falls back to `Date.now()` if no resolver is set. Throws
 * `ClockTamperingError` if the wall clock is rolled back.
 */
export function assertClockNotTampered(wallClockMs: number = Date.now()): void {
  const floor = _floorResolver ? _floorResolver() : Date.now()
  assertClockNotTamperedWith(wallClockMs, floor)
}