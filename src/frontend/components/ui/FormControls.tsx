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

interface FormAlertProps {
  error?: Error | null;
  success?: string | null;
}

export const FormAlert = ({ error, success }: FormAlertProps) => {
  if (!error && !success) return null;

  if (error) {
    return (
      <div className="border border-retro-red bg-retro-red/10 text-retro-red px-4 py-3 font-mono text-sm">
        <span className="font-bold">&gt; ERROR:</span> {error.message}
      </div>
    );
  }

  if (success) {
    return (
      <div className="border border-retro-green bg-retro-green/10 text-retro-green px-4 py-3 font-mono text-sm">
        <span className="font-bold">&gt;</span> {success}
      </div>
    );
  }

  return null;
};