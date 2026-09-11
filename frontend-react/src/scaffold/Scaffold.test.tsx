/** The rule that keeps scaffold banners off a customer's screen.
 *
 *  `MVP_SURFACE` gates whole screens. A scaffold block *inside* a wired screen
 *  — Client 360's tags, GDPR, risk flags — is reached by no list, and on
 *  2026-09-11 three of those banners were photographed on a handed-over build.
 *  So the block itself reads which build it is in, and on "mvp" renders
 *  nothing at all. */

import { render, screen } from "@testing-library/react";

import { ScaffoldBlock, ScaffoldExposureProvider } from "./Scaffold";
import { findByPath } from "./ia";

const node = findByPath("customers/groups");
if (!node) throw new Error("the IA lost customers/groups");

test("under the dev exposure a scaffold block states what is missing", () => {
  render(
    <ScaffoldExposureProvider exposure="all">
      <ScaffoldBlock node={node} title="Tags & groups" />
    </ScaffoldExposureProvider>,
  );
  expect(screen.getByRole("region", { name: /Tags & groups/ })).toBeInTheDocument();
  expect(screen.getByText(/no server behind|nothing on the server/i)).toBeInTheDocument();
});

test("on a handed-over build the same block is simply absent", () => {
  const { container } = render(
    <ScaffoldExposureProvider exposure="mvp">
      <ScaffoldBlock node={node} title="Tags & groups" />
    </ScaffoldExposureProvider>,
  );
  expect(container).toBeEmptyDOMElement();
  expect(screen.queryByText(/no server behind|nothing on the server/i)).not.toBeInTheDocument();
});

test("with no provider at all the block shows — a test that forgot the provider must not hide gaps by accident", () => {
  render(<ScaffoldBlock node={node} title="Tags & groups" />);
  expect(screen.getByRole("region", { name: /Tags & groups/ })).toBeInTheDocument();
});
