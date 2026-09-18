import { ArrowLeft } from "@untitledui/icons";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import s from "./ui.module.css";

export type NavItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
} & ({ onClick: () => void } | { href: string });

export const HOME_NAV: NavItem[] = [
  { key: "home", label: "На главную", icon: <ArrowLeft size={16} />, href: "/" },
];

export function NavBar({ items }: { items: NavItem[] }) {
  return (
    <nav className={s.nav} aria-label="Навигация">
      <Link href="/" className={s.navLogo} aria-label="На главную">
        <Image src="/logo.svg" alt="" width={55} height={20} priority />
      </Link>
      <div className={s.navTabs}>
        {items.map((item) => {
          const content = (
            <>
              {item.icon}
              {item.label}
            </>
          );
          const common = {
            className: s.navTab,
            "aria-current": item.active ? ("page" as const) : undefined,
          };
          return "href" in item ? (
            <Link key={item.key} href={item.href} {...common}>
              {content}
            </Link>
          ) : (
            <button key={item.key} type="button" onClick={item.onClick} {...common}>
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
