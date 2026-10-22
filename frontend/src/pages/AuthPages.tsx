import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth, type RegisterInput } from '../auth/AuthContext';
import { errorMessage } from '../lib/api';
import { Button, ErrorBox, Field } from '../components/ui';

// Only allow redirects to our own pages, never to another site
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

function AuthCard({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle={
        <>
          New here?{' '}
          <Link to={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-600">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorBox message={error} />}
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Log in
        </Button>
      </form>
      <p className="mt-6 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
        Demo customer: <code>customer@demo.local</code> / <code>Customer@12345</code>
      </p>
    </AuthCard>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState<RegisterInput>({ name: '', email: '', phone: '', password: '', role: 'CUSTOMER' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const update = (key: keyof RegisterInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ ...form, phone: form.phone?.trim() || undefined });
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle={
        <>
          Already have one?{' '}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-600">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorBox message={error} />}

        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-sm font-medium text-gray-700">I want to</legend>
          {(
            [
              ['CUSTOMER', '🍕 Order food'],
              ['RESTAURANT_OWNER', '🏪 List my restaurant'],
            ] as const
          ).map(([role, label]) => (
            <label
              key={role}
              className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium ${
                form.role === role ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="role"
                className="sr-only"
                checked={form.role === role}
                onChange={() => setForm((f) => ({ ...f, role }))}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <Field label="Full name" required autoComplete="name" value={form.name} onChange={update('name')} />
        <Field label="Email" type="email" required autoComplete="email" value={form.email} onChange={update('email')} />
        <Field
          label="Mobile number (optional)"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          autoComplete="tel-national"
          placeholder="10-digit number"
          value={form.phone}
          onChange={update('phone')}
        />
        <Field
          label="Password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={update('password')}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Sign up
        </Button>
      </form>
    </AuthCard>
  );
}
