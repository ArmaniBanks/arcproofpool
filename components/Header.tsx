"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FaucetHelper } from "@/components/FaucetHelper";

const THEME_KEY = "arcproofpool:theme";

const links = [
  ["Marketplace", "/marketplace"],
  ["Create", "/create-task"],
  ["Leaderboard", "/leaderboard"],
  ["Activity", "/activity"],
  ["Register", "/register"],
  ["Dashboard", "/dashboard"]
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[#0a0a0a]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-3 lg:gap-5 sm:px-6">
        <Link href="/marketplace" className="flex shrink-0 items-center gap-3 text-xl font-black tracking-normal text-white md:gap-2 lg:gap-3">
          <svg
            aria-hidden="true"
            className="h-8 w-8 shrink-0 md:h-7 md:w-7 lg:h-8 lg:w-8"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M16 2.5 28 9.25v13.5L16 29.5 4 22.75V9.25L16 2.5Z" fill="#3B82F6" />
            <path d="M16 6.5 24.5 11.3v9.4L16 25.5l-8.5-4.8v-9.4L16 6.5Z" fill="#0a0a0a" fillOpacity="0.22" />
            <path
              d="M9.35 17.55 15.1 10.7h7.55l-7.7 9.15 3.65 1.95 3.3-3.85h-3.65l2.28-2.7h7.07l-7.9 9.35-9.1-4.9 2.18-2.15 2.32 1.25 4.56-5.42h-3.18l-5.02 5.94-2.11-1.77Z"
              fill="white"
            />
          </svg>
          <span className="md:hidden lg:inline">ArcProofPool</span>
        </Link>
        <nav className="flex min-w-0 flex-nowrap items-center justify-center gap-1 rounded-lg border border-line bg-white/[0.025] p-1">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={`shrink-0 whitespace-nowrap rounded-md px-1.5 py-2 text-[10px] font-semibold lg:px-3 lg:text-sm ${
                pathname === href
                  ? "bg-arc text-white shadow-[0_12px_32px_rgba(59,130,246,0.28)]"
                  : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center md:flex-nowrap md:gap-2">
          <ThemeToggle />
          <FaucetHelper className="whitespace-nowrap px-2 py-2 text-[10px] lg:px-3 lg:text-xs" />
          <HeaderWalletButton />
        </div>
      </div>
    </header>
  );
}

function HeaderWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            aria-hidden={!ready}
            className={!ready ? "pointer-events-none select-none opacity-0" : undefined}
          >
            {(() => {
              if (!connected) {
                return (
                  <button className="btn btn-primary min-h-9 whitespace-nowrap px-3 text-xs lg:min-h-11 lg:px-4 lg:text-sm" onClick={openConnectModal} type="button">
                    <span className="lg:hidden">Connect</span>
                    <span className="hidden lg:inline">Connect Wallet</span>
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button className="btn btn-danger min-h-9 whitespace-nowrap px-3 text-xs lg:min-h-11 lg:px-4 lg:text-sm" onClick={openChainModal} type="button">
                    Wrong network
                  </button>
                );
              }

              return (
                <button className="btn btn-primary min-h-9 whitespace-nowrap px-3 text-xs lg:min-h-11 lg:px-4 lg:text-sm" onClick={openAccountModal} type="button">
                  {account.displayName}
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    const initialTheme = stored === "light" ? "light" : "dark";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("light", initialTheme === "light");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("light", nextTheme === "light");
    window.localStorage.setItem(THEME_KEY, nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex min-h-9 items-center justify-center rounded-md border border-line bg-white/[0.03] px-3 text-xs font-black text-zinc-300 transition hover:border-arc/50 hover:text-white"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    >
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
