import { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "cedar-os";

interface Flat3dButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    PropsWithChildren {
  childClassName?: string;
  whileHover?: Record<string, unknown>;
}

const Flat3dButton = ({
  className,
  childClassName,
  children,
  whileHover,
  ...props
}: Flat3dButtonProps) => {
  return (
    <button
      {...props}
      className={cn(
        "relative rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-200",
        className
      )}
    >
      <span className={cn("block", childClassName)}>{children}</span>
    </button>
  );
};

export default Flat3dButton;
