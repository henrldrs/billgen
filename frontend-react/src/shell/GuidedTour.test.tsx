/** The coach-mark component itself, over a page it does not own. jsdom
 *  reports every box as 0×0, so each step degrades to the centered card —
 *  which is also the behaviour a missing anchor gets in a browser, and the
 *  one thing this test needs true: the tour never breaks on a page that has
 *  moved on underneath it. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { GuidedTour, type TourStep } from "@henrioutai/ui";

const STEPS: TourStep[] = [
  { key: "one", anchor: ".nowhere", title: "First stop", body: "One" },
  { key: "two", title: "Second stop", body: "Two" },
  { key: "three", anchor: "#also-nowhere", title: "Third stop", body: "Three" },
];

test("walks the steps forward and back, and reports how it ended", async () => {
  const onClose = vi.fn();
  render(<GuidedTour open steps={STEPS} onClose={onClose} />);

  const dialog = screen.getByRole("dialog", { name: "Guided tour" });
  expect(dialog).toHaveTextContent("Step 1 of 3");
  expect(dialog).toHaveTextContent("First stop");
  expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(dialog).toHaveTextContent("Step 2 of 3");
  await userEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(dialog).toHaveTextContent("First stop");

  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(dialog).toHaveTextContent("Third stop");
  //  The last step's forward button finishes rather than advancing into
  //  nothing.
  expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Done" }));
  expect(onClose).toHaveBeenCalledWith("finished");
});

test("Escape and Skip both end it as skipped, and closed it renders nothing", async () => {
  const onClose = vi.fn();
  const { rerender } = render(<GuidedTour open steps={STEPS} onClose={onClose} />);

  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenLastCalledWith("skipped");

  await userEvent.click(screen.getByRole("button", { name: "Skip the tour" }));
  expect(onClose).toHaveBeenLastCalledWith("skipped");

  rerender(<GuidedTour open={false} steps={STEPS} onClose={onClose} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("labels are the caller's, and a step change is announced before measuring", async () => {
  const onStepChange = vi.fn();
  render(
    <GuidedTour
      open
      steps={STEPS}
      onClose={() => {}}
      onStepChange={onStepChange}
      labels={{
        dialog: "Visite guidée",
        next: "Suivant",
        skip: "Passer",
        stepOf: (index, count) => `Étape ${index} sur ${count}`,
      }}
    />,
  );

  expect(screen.getByRole("dialog", { name: "Visite guidée" })).toHaveTextContent("Étape 1 sur 3");
  expect(onStepChange).toHaveBeenLastCalledWith(STEPS[0], 0);
  await userEvent.click(screen.getByRole("button", { name: "Suivant" }));
  expect(onStepChange).toHaveBeenLastCalledWith(STEPS[1], 1);
});
