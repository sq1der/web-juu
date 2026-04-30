import Spinner from './Spinner'

const variants = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
}
const sizeCls = { sm: 'btn-sm', md: '', lg: 'btn-lg' }

export default function Button({
  children,
  variant = 'primary',
  size    = 'md',
  loading = false,
  className = '',
  icon,
  ...props
}) {
  return (
    <button
      className={`btn ${variants[variant]} ${sizeCls[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  )
}