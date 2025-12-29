import { Button } from "./ui";

/**
 * PageHeader component for consistent page titles and actions
 */
export default function PageHeader({
  title,
  description,
  actions,
  breadcrumbs
}) {
  return (
    <div className="mb-6">
      {breadcrumbs && (
        <nav className="mb-4 text-sm text-slate-600">
          {breadcrumbs}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="section-title">{title}</h1>
          {description && (
            <p className="section-description">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {Array.isArray(actions) ? (
              actions.map((action, index) => (
                <div key={index}>{action}</div>
              ))
            ) : (
              actions
            )}
          </div>
        )}
      </div>
    </div>
  );
}