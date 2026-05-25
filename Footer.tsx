import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-[#0a0a0a]/88">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 text-sm text-zinc-500 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="font-black text-zinc-300">Demo Mode Notes</p>
          <p className="mt-1 leading-6">
            Arc Testnet only. Uses test USDC. One wallet can register once. Use a second wallet to test proof submission.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/create-task" className="font-black text-blue-300 hover:text-blue-100">
            Create task
          </Link>
          <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="font-black text-blue-300 hover:text-blue-100">
            Get test USDC
          </a>
        </div>
      </div>
    </footer>
  );
}
