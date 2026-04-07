import { useEffect } from 'react'

export default function Modal({ title, children, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-charcoal/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-xl shadow-charcoal/10 border border-border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-subtle flex justify-between items-center bg-warmwhite/50">
          <h3 className="font-display font-bold text-lg text-charcoal">{title}</h3>
          <button 
            onClick={onClose}
            className="text-secondary hover:text-error hover:bg-red-50 transition-colors rounded-lg p-1.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 text-charcoal">
          {children}
        </div>
      </div>
    </div>
  )
}
