import { ButtonHTMLAttributes, CSSProperties, PropsWithChildren } from "react";
import { cn } from "cedar-os";

interface Container3DButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    PropsWithChildren {
  childClassName?: string;
  motionProps?: Record<string, unknown>;
  color?: string;
  withMotion?: boolean;
}

const Container3DButton = ({
  className,
  childClassName,
  children,
  motionProps, // Accepted for compatibility with original component API
  color,
  withMotion,
  style,
  ...props
}: Container3DButtonProps & { style?: CSSProperties }) => {
  return (
    <button
      {...props}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-200",
        className
      )}
      style={{ ...(color ? { backgroundColor: color } : {}), ...style }}
    >
      <span className={cn("block", childClassName)}>{children}</span>
    </button>
  );
};

export default Container3DButton;
