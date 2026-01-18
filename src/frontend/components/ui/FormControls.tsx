import { cn } from "../../lib/utils";
import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "bg-panel border border-gold-faint text-gold-primary px-3 py-2 text-sm font-mono w-full focus:outline-none focus:border-gold-primary placeholder:text-gold-faint/50",
        className
      )}
      {...props}
    />
  )
);

export const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={cn("block text-xs uppercase text-gold-dim mb-1 tracking-wider", className)}>
    {children}
  </label>
);

export const ErrorMsg = ({ children }: { children?: React.ReactNode }) => (
  <div className="text-retro-red text-xs mt-1 font-mono">{children}</div>
);