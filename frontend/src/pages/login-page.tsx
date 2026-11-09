import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole } from 'lucide-react';
import { api, apiErrorMessage } from '../lib/api';
import { Button } from '../components/ui/button';
import { useAuthStore, type User } from '../store/auth-store';
import { validatePassword, validateUsername } from '../lib/validation';

type FieldErrors = { username?: string; password?: string };

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    const usernameError = validateUsername(username);
    if (usernameError) nextErrors.username = usernameError;
    const passwordError = validatePassword(password);
    if (passwordError) nextErrors.password = passwordError;
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length) return;

    setPending(true);
    try {
      const { data } = await api.post<{ access_token: string }>('/api/auth/login', {
        username: username.trim(),
        password,
      });
      const me = await api.get<User>('/api/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } });
      setSession(data.access_token, me.data);
      navigate((location.state as { from?: string } | null)?.from ?? '/chat', { replace: true });
    } catch (reason) {
      setError(apiErrorMessage(reason, 'Unable to sign in.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form className="w-full max-w-sm rounded-2xl border border-border bg-card p-7" noValidate onSubmit={submit}>
        <div className="mb-7">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">K</div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Access your Knova workspace.</p>
        </div>

        <label className="mb-4 block text-sm">
          <span className="mb-2 block text-muted-foreground">Username</span>
          <input
            aria-describedby={errors.username ? 'login-username-error' : undefined}
            aria-invalid={Boolean(errors.username)}
            autoComplete="username"
            className={`h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring ${errors.username ? 'border-red-400' : 'border-input'}`}
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              if (errors.username) setErrors((current) => ({ ...current, username: undefined }));
            }}
          />
          {errors.username && <span className="mt-1.5 block text-xs text-red-300" id="login-username-error">{errors.username}</span>}
        </label>

        <label className="mb-5 block text-sm">
          <span className="mb-2 block text-muted-foreground">Password</span>
          <input
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            aria-invalid={Boolean(errors.password)}
            autoComplete="current-password"
            className={`h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring ${errors.password ? 'border-red-400' : 'border-input'}`}
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
            }}
          />
          {errors.password && <span className="mt-1.5 block text-xs text-red-300" id="login-password-error">{errors.password}</span>}
        </label>

        {error && <p className="mb-4 text-sm text-red-300" role="alert">{error}</p>}

        <Button className="w-full" disabled={pending}>
          {pending ? <><Loader2 className="mr-2 animate-spin" size={16} />Signing in...</> : <><LockKeyhole className="mr-2" size={16} />Sign in</>}
        </Button>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Need an account? <Link className="text-primary hover:underline" to="/register">Register</Link>
        </p>
      </form>
    </main>
  );
}
