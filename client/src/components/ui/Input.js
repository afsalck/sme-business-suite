import clsx from "clsx";

/**
 * Input component with consistent styling
 */
export default function Input({
  label,
  error,
  helperText,
  className = "",
  containerClassName = "",
  required = false,
  id,
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={clsx("w-full", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm",
          "text-slate-900 placeholder-slate-400",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20",
          "transition-all duration-200",
          "disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500",
          error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500",
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-rose-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
}