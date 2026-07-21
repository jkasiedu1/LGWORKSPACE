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
        await signInWithEmailAndPassword(auth, email, password);
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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-orange-300/30 blur-3xl" />
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden border border-white/70 shadow-2xl bg-white/80 backdrop-blur-xl">
        <aside className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-stone-900 to-stone-800 text-white">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Grid size={28} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-300">Ministry Workspace</p>
                <h1 className="text-3xl font-serif font-bold leading-tight">Lifegate AG</h1>
              </div>
            </div>
            <p className="text-stone-200 text-sm leading-relaxed">A focused operations console for services, people, communications, and secure leadership workflows.</p>
          </div>
          <div className="space-y-3 text-sm text-stone-200">
            <p className="font-semibold text-white">Trusted by your teams each week</p>
            <p>Current host: {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}</p>
          </div>
        </aside>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              <Grid size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-stone-900">Lifegate AG</h2>
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Workspace Portal</p>
            </div>
          </div>

          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">Welcome back</h3>
          <p className="mt-1 text-sm text-stone-500">Sign in to continue managing ministry operations.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1.5 uppercase tracking-[0.14em]">Email Address</label>
              <input type="email" required className="relative block w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 focus:z-10 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 sm:text-sm transition-colors" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1.5 uppercase tracking-[0.14em]">Password</label>
              <input type="password" required className="relative block w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 focus:z-10 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 sm:text-sm transition-colors" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {errorMsg && (
              <div className="bg-rose-50 text-rose-700 text-sm p-3 rounded-xl flex items-center gap-2 font-medium border border-rose-200">
                <AlertCircle size={16} />{errorMsg}
              </div>
            )}

            <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-900">
              <p className="font-bold uppercase tracking-wide">First-time invited user</p>
              <p className="mt-1">Open the password setup email from your Super Admin, create your password, then sign in here.</p>
            </div>

            <button type="submit" disabled={isLoading || !email || !password} className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-3 py-3 text-sm font-bold text-white hover:from-orange-500 hover:to-amber-400 disabled:opacity-70 transition-all shadow-lg">
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Sign in to Workspace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
