import type { SVGProps } from "react";

export function HelpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M5 6h10a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H11l-3 3v-3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 10a2 2 0 1 1 2 2" className="icon-accent" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="15.5" r="0.8" className="icon-accent" fill="currentColor" stroke="none" />
    </svg>
  );
}
