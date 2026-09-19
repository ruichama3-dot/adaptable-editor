import logoMark from "@/assets/logo.png";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src={logoMark}
        alt="RuJe IA"
        width={1024}
        height={1024}
        className={`${box} shadow-brand rounded-xl object-cover`}
      />
      <span className={`${text} font-display font-bold tracking-tight`}>
        RuJe <span className="text-brand-gradient">IA</span> <span aria-hidden>🇲🇿</span>
      </span>
    </span>
  );
}
