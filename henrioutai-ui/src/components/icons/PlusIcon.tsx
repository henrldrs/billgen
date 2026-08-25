import type { SVGProps } from "react";

// Normalised 2.5 -> 2 for BGEN-BRAND-03 (one stroke weight, no exceptions).
// A plus carries very little ink, so it reads marginally lighter than the
// denser icons at the same weight — that is an optical trade the grammar
// accepts, because one icon at its own weight is what starts the drift.

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
