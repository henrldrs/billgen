import { configure } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/** Testing Library's default `findBy*` budget is 1000ms, and several panels
 *  here need two sequential round trips before the thing being asserted on can
 *  render — InvoiceDetailPanel fetches the invoice, then fetches the client it
 *  names. Under `vitest run` all 29 files execute in parallel, and on a loaded
 *  machine that chain has been measured past 2s.
 *
 *  This is a latency budget, not a masked bug: the assertions are already
 *  `findBy*`, so they wait for the real thing rather than sleeping, and a test
 *  that is genuinely broken still fails — it just takes 5s to say so instead of
 *  1s. Raising it globally rather than per assertion keeps the next panel with
 *  the same shape from having to discover this again.
 */
configure({ asyncUtilTimeout: 5000 });
