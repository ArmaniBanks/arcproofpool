type FaucetHelperProps = {
  className?: string;
  gas?: boolean;
};

export function FaucetHelper({ className = "", gas = false }: FaucetHelperProps) {
  return (
    <p className={`rounded-md border border-line bg-white/[0.025] px-3 py-2 text-xs font-semibold leading-5 text-zinc-400 ${className}`}>
      {gas ? "Need test USDC for gas? " : "Need test USDC? "}
      <a
        className="text-[#3B82F6] underline-offset-4 hover:text-blue-300 hover:underline"
        href="https://faucet.circle.com/"
        target="_blank"
        rel="noreferrer"
      >
        Get it from the faucet.
      </a>
    </p>
  );
}
