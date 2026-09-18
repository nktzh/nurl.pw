import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number };

// Brand marks are not part of Untitled UI, so they live here.
export function TelegramIcon({ size = 20, ...rest }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...rest}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.64 6.8-1.64 7.74c-.12.55-.45.68-.91.42l-2.5-1.84-1.2 1.16c-.14.14-.25.25-.51.25l.18-2.55 4.64-4.19c.2-.18-.04-.28-.31-.1l-5.73 3.61-2.47-.77c-.54-.17-.55-.54.11-.8l9.65-3.72c.45-.16.84.11.69.79Z" />
    </svg>
  );
}

export function XLogoIcon({ size = 20, ...rest }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...rest}>
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.84-6.32L5.46 21H2.38l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z" />
    </svg>
  );
}
