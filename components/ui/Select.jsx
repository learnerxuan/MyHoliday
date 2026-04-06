export default function Select({ options = [], className = '', ...props }) {
  return (
    <select 
      className={`w-full px-3 py-2 text-sm text-charcoal bg-white border border-border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber appearance-none cursor-pointer ${className}`}
      {...props}
    >
      {options.map((opt, i) => (
        <option key={i} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
