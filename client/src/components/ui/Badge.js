import clsx from "clsx";

/**
 * Badge component for status indicators
 */
export default function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...props
}) {
  const variants = {
    default: "bg-slate-100 text-slate-800",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-800",
    danger: "bg-rose-100 text-rose-800",
    warning: "bg-amber-100 text-amber-800",
    info: "bg-blue-100 text-blue-800"
  };
  
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm"
  };
  
  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium rounded-full",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}