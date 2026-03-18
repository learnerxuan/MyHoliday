# Todo: Authentication & User Profile

## Checklist

### Login Page
- [ ] Create `app/auth/login/page.jsx`
- [ ] Build login form with email and password Input components
- [ ] Add "Login" Button (primary variant)
- [ ] Add "Forgot Password?" link below the form
- [ ] Add "Don't have an account? Register" link
- [ ] Implement Supabase Auth `signInWithPassword` on form submit
- [ ] Show error message on failed login (invalid credentials, etc.)
- [ ] Redirect on success based on user role (traveller → home, guide → guide marketplace, admin → dashboard)

### Register Page (Traveller)
- [ ] Create `app/auth/register/page.jsx`
- [ ] Build registration form: email, password, confirm password, full name
- [ ] Add password validation (minimum length, match confirmation)
- [ ] Implement Supabase Auth `signUp` with `role: 'traveller'` in metadata
- [ ] Create corresponding row in `traveller_profiles` table after signup
- [ ] Redirect to profile page to complete optional fields
- [ ] Add "Already have an account? Login" link

### Register Page (Tour Guide)
- [ ] Add a toggle or separate route for guide registration
- [ ] Collect: email, password, full name, assigned city
- [ ] Implement Supabase Auth `signUp` with `role: 'guide'` in metadata
- [ ] Create row in `tour_guides` table with `verification_status: 'pending'`
- [ ] Add document upload section using Supabase Storage
- [ ] Show message that account is pending admin approval

### Forgot Password Page
- [ ] Create `app/auth/forgot-password/page.jsx`
- [ ] Build form with email Input
- [ ] Implement Supabase Auth `resetPasswordForEmail`
- [ ] Show success confirmation message after submission
- [ ] Add "Back to Login" link

### User Profile Page
- [ ] Create `app/profile/page.jsx`
- [ ] Protect route — redirect to login if not authenticated
- [ ] Display Avatar component with user name
- [ ] For travellers: show editable fields — full name, age, nationality, dietary restrictions, accessibility needs, preferred language
- [ ] For guides: show full name, assigned city (read-only), verification status badge, document upload section
- [ ] Add "Save Changes" button that updates the relevant profile table
- [ ] Show success/error feedback on save

### Session & Route Protection
- [ ] Create a Supabase auth state listener (e.g., in a context provider or middleware)
- [ ] Implement route protection middleware or wrapper for authenticated pages
- [ ] Implement role-based access checks — prevent cross-role route access
- [ ] Add a logout function accessible from the Navbar

### RLS Policies
- [ ] Write RLS policy: users can only read/update their own `traveller_profiles` row
- [ ] Write RLS policy: users can only read/update their own `tour_guides` row
- [ ] Write RLS policy: guide documents are only accessible by the owning guide and admins
- [ ] Test that cross-user data access is blocked
