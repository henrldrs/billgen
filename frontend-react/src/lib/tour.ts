/** Whether the guided tour is owed. Three states in one localStorage key:
 *  absent (never asked — an install from before the tour existed, or a dev
 *  database), `pending` (the first run just finished and the tour has not
 *  been shown), `done` (shown once, finished or skipped).
 *
 *  Deliberately not a server fact, unlike the first run itself. Whether
 *  setup is complete is a fact about the organization and survives a
 *  reinstall; whether this person has seen the coach marks on this screen is
 *  a fact about this screen. Putting it on the user would need a column, a
 *  migration and an endpoint to record that somebody pressed "Skip", and it
 *  can always be replayed from the account menu, so nothing is lost when a
 *  browser forgets it — one more tour, at worst. */

const STORAGE_KEY = "billgen.tour";

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function write(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* private mode — the tour simply shows again next time */
  }
}

export function tourPending(): boolean {
  return read() === "pending";
}

/** The first run just finished: show the tour once the wizard is left. */
export function requestTour(): void {
  write("pending");
}

export function markTourDone(): void {
  write("done");
}
