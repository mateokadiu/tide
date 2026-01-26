import { redirect } from 'next/navigation';

// signup is the same flow as login (magic link auto-creates).
export default function SignupPage() {
  redirect('/login');
}
