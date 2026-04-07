export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = "inline-flex justify-center items-center gap-2 px-4 py-2 text-sm font-semibold font-body rounded-lg transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
  const variants = {
    primary: "bg-amber text-warmwhite hover:bg-amberdark shadow-sm",
    secondary: "bg-subtle text-charcoal hover:bg-slate-200 border border-border"
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
