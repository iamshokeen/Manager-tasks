// Redirect to the real login page
import { redirect } from 'next/navigation'

export default function LoginRedirect() {
  redirect('/auth/login')
}
