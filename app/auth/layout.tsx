/**
 * Auth layout — no navbar, no footer.
 * -mt-24 cancels the root layout's pt-24 so auth pages own the full viewport.
 * Pages use pt-28 to ensure content always starts below the fixed Navbar.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mt-24 min-h-screen bg-warmwhite overflow-y-auto">
      {children}
    </div>
  )
}
