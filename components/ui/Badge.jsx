export default function Badge({ children, variant = 'gray' }) {
  const variants = {
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    amber: 'bg-amber/10 text-amber border-amber/20',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border font-body tracking-wide ${variants[variant]}`}>
      {children}
    </span>
  )
}
