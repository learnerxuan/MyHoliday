export default function Input({ className = '', ...props }) {
  return (
    <input 
      className={`w-full px-3 py-2 text-sm text-charcoal bg-white border border-border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber disabled:bg-subtle disabled:text-secondary disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  )
}
