import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, UserPlus } from 'lucide-react';
import { api, apiErrorMessage } from '../lib/api';
import { Button } from '../components/ui/button';
import { validatePassword, validateTenant, validateUsername } from '../lib/validation';

type FieldErrors = { username?: string; tenant?: string; password?: string };

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [tenant, setTenant] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    const usernameError = validateUsername(username);
    if (usernameError) nextErrors.username = usernameError;
    const tenantError = validateTenant(tenant);
    if (tenantError) nextErrors.tenant = tenantError;
    const passwordError = validatePassword(password);
    if (passwordError) nextErrors.password = passwordError;
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length) return;

    setPending(true);
    try {
      await api.post('/api/auth/register', { username: username.trim(), tenant: tenant.trim(), password });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (reason) {
      setError(apiErrorMessage(reason, 'Unable to create account.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form className="w-full max-w-sm rounded-2xl border border-border bg-card p-7" noValidate onSubmit={submit}>
        <div className="mb-7">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">K</div>
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create a user account for a Knova workspace.</p>
        </div>

        <label className="mb-4 block text-sm">
          <span className="mb-2 block text-muted-foreground">Username</span>
          <input
            aria-describedby={errors.username ? 'register-username-error' : undefined}
            aria-invalid={Boolean(errors.username)}
            autoComplete="username"
            className={`h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring ${errors.username ? 'border-red-400' : 'border-input'}`}
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              if (errors.username) setErrors((current) => ({ ...current, username: undefined }));
            }}
          />
          {errors.username && <span className="mt-1.5 block text-xs text-red-300" id="register-username-error">{errors.username}</span>}
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-2 block text-muted-foreground">Workspace</span>
          <input
            aria-describedby={errors.tenant ? 'register-tenant-error' : undefined}
            aria-invalid={Boolean(errors.tenant)}
            className={`h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring ${errors.tenant ? 'border-red-400' : 'border-input'}`}
            value={tenant}
            onChange={(event) => {
              setTenant(event.target.value);
              if (errors.tenant) setErrors((current) => ({ ...current, tenant: undefined }));
            }}
          />
          {errors.tenant && <span className="mt-1.5 block text-xs text-red-300" id="register-tenant-error">{errors.tenant}</span>}
        </label>

        <label className="mb-5 block text-sm">
          <span className="mb-2 block text-muted-foreground">Password</span>
          <input
            aria-describedby={errors.password ? 'register-password-error' : undefined}
            aria-invalid={Boolean(errors.password)}
            autoComplete="new-password"
            className={`h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring ${errors.password ? 'border-red-400' : 'border-input'}`}
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
            }}
          />
          {errors.password && <span className="mt-1.5 block text-xs text-red-300" id="register-password-error">{errors.password}</span>}
          <span className="mt-1.5 block text-xs text-muted-foreground">At least 8 characters.</span>
        </label>

        {error && <p className="mb-4 text-sm text-red-300" role="alert">{error}</p>}

        <Button className="w-full" disabled={pending}>
          {pending ? <><Loader2 className="mr-2 animate-spin" size={16} />Creating account...</> : <><UserPlus className="mr-2" size={16} />Create account</>}
        </Button>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account? <Link className="text-primary hover:underline" to="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
