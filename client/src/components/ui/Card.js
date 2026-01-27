import clsx from "clsx";

/**
 * Card component for consistent container styling
 */
export default function Card({
  children,
  className = "",
  padding = "md",
  shadow = "sm",
  hover = false,
  ...props
}) {
  const paddings = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8"
  };
  
  const shadows = {
    none: "shadow-none",
    sm: "shadow-sm",
    md: "shadow",
    lg: "shadow-lg"
  };
  
  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-200 bg-white",
        paddings[padding],
        shadows[shadow],
        hover && "transition-shadow duration-200 hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}