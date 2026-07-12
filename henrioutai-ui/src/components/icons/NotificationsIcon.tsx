import type { SVGProps } from "react";

export function NotificationsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 5a4 4 0 0 1 4 4v3.5l1.5 2.5H6.5L8 12.5V9a4 4 0 0 1 4-4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="7" r="2" className="icon-accent" fill="currentColor" stroke="none" />
    </svg>
  );
}
