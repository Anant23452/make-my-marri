import assert from "node:assert/strict";
import { weddingCountdown } from "../src/modules/dashboard/dashboard-calendar.ts";
assert.equal(weddingCountdown("2026-10-09", "Asia/Kolkata", new Date("2026-10-08T18:29:00Z")).days, 1);
assert.equal(weddingCountdown("2026-10-09", "Asia/Kolkata", new Date("2026-10-08T18:30:00Z")).days, 0);
assert.equal(weddingCountdown("2026-10-07", "Asia/Kolkata", new Date("2026-10-08T00:00:00Z")).days, -1);
assert.equal(weddingCountdown("2026-10-09", "Asia/Kolkata", new Date("2026-10-08T00:00:00Z")).label, "1 day to go");
console.log("PASS: wedding countdown respects wedding-local midnight and past/today/future dates.");
