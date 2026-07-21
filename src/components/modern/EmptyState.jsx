export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
          <Icon size={32} className="text-neutral-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
      {description && <p className="text-secondary mb-6 max-w-md">{description}</p>}
      {action && action}
    </div>
  );
}
