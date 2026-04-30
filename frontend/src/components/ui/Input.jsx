export default function Input({
  label,
  error,
  hint,
  className = '',
  leftIcon,
  rightIcon,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          className={`input ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${error ? 'border-red-400 focus:border-red-400 focus:shadow-none' : ''}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )
}

export function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="label">{label}</label>}
      <select
        className={`input ${error ? 'border-red-400' : ''}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="label">{label}</label>}
      <textarea
        className={`input resize-none ${error ? 'border-red-400' : ''}`}
        rows={4}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}