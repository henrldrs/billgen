import type { SVGProps } from "react";

export function LanguageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6a10 10 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="8" y="11" fontSize="3" className="icon-accent" fill="currentColor" fontFamily="system-ui">
        FR
      </text>
      <text x="13" y="16" fontSize="3" className="icon-accent" fill="currentColor" fontFamily="system-ui">
        NL
      </text>
    </svg>
  );
}
