export default function WorkflowCard({ title, trigger, actions, icon: Icon }) {
  return (
    <div className="p-5 flex items-start gap-4 hover:bg-stone-50 transition-colors cursor-pointer group">
      <div className="p-2.5 bg-stone-100 rounded-lg text-stone-500 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h4 className="font-semibold text-stone-900">{title}</h4>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-700 uppercase tracking-wider">Active</span>
        </div>
        <div className="mt-1 text-sm text-stone-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span><strong className="font-medium text-stone-700">When:</strong> {trigger}</span>
          <span className="hidden sm:inline text-stone-300">•</span>
          <span><strong className="font-medium text-stone-700">Then:</strong> {actions}</span>
        </div>
      </div>
    </div>
  );
}
