export default function Avatar({ name = 'U', url, size = 'md' }) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  }

  if (url) {
    return (
      <img 
        src={url} 
        alt={name} 
        className={`${sizes[size]} rounded-full object-cover border-2 border-white shadow-sm`}
      />
    )
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-amber text-warmwhite font-bold font-body flex items-center justify-center border-2 border-white shadow-sm tracking-wider`}>
      {initials}
    </div>
  )
}
