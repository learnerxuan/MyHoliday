export default function Spinner({ className = '' }) {
  // Graceful fallback defaults to match old 'h-5 w-5' and a standard border-width if none provided
  const hasSize = className.includes('w-') || className.includes('h-')
  const hasBorder = className.includes('border-') && !className.includes('border-charcoal')

  return (
    <div 
      className={`rounded-full animate-spin border-charcoal/20 border-t-amber ${hasSize ? '' : 'w-5 h-5'} ${hasBorder ? '' : 'border-2'} ${className}`}
    ></div>
  )
}
