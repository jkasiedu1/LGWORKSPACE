import { useState } from 'react';
import { Grid, AlertCircle, Loader2 } from 'lucide-react';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

function formatAuthError(error) {
  const code = error?.code || 'auth/unknown';

  if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
    return 'The email or password is incorrect.';
  }

  if (code === 'auth/user-not-found') {
    return 'No Firebase user exists for that email address.';
  }

  if (code === 'auth/wrong-password') {
    return 'The password is incorrect.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Too many failed attempts. Wait a moment and try again.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Network request failed. Check that this device can reach Firebase.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Email/password sign-in is not enabled in Firebase Authentication.';
  }

  if (code === 'auth/unauthorized-domain') {
    return `This host is not authorized in Firebase Auth. Add ${window.location.hostname} to Firebase Authentication > Settings > Authorized domains.`;
  }

  return error?.message || 'Sign-in failed.';
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (auth) {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        if (!credential.user.emailVerified) {
          await auth.signOut();
          setErrorMsg('Please verify your email address before signing in. Check your inbox for a verification link.');
          return;
        }
      } else {
        setErrorMsg('Firebase Auth is not connected.');
      }
    } catch (error) {
      setErrorMsg(formatAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-stone-200">
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Grid size={32} className="text-stone-800" />
          </div>
          <h2 className="mt-2 text-center text-3xl font-serif font-bold tracking-tight text-stone-900">Lifegate AG</h2>
          <p className="mt-2 text-center text-sm text-stone-500 font-medium">Workspace &amp; Ministry Portal</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Email Address</label>
              <input type="email" required className="relative block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm transition-colors" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Password</label>
              <input type="password" required className="relative block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm transition-colors" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          {errorMsg && (
            <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-lg flex items-center gap-2 font-medium">
              <AlertCircle size={16} />{errorMsg}
            </div>
          )}
          <p className="text-xs text-stone-400 text-center">
            Current host: {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}
          </p>
          <div>
            <button type="submit" disabled={isLoading || !email || !password} className="group relative flex w-full justify-center rounded-lg bg-stone-900 px-3 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-70 transition-all">
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Sign in to Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
