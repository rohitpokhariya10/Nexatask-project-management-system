import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, FieldError, RequiredMark } from '../../components/common/ui';
import { useAuth } from '../../features/auth/auth-context';
import { loginSchema, type LoginValues } from '../../features/auth/schemas';
import { getApiError } from '../../lib/api';
import { AuthShell } from './AuthShell';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = handleSubmit(async (values) => {
    try {
      await login(values);
      toast.success('Welcome back.');
      const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(destination, { replace: true });
    } catch (error) {
      toast.error(getApiError(error, 'Unable to sign in.'));
    }
  });

  return (
    <AuthShell
      title="Sign in to your workspace"
      description="Use your organization account to continue."
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <label className="field-label" htmlFor="email">
            Email address
            <RequiredMark />
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="field"
            placeholder="you@countryedu.org"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <label className="field-label" htmlFor="password">
            Password
            <RequiredMark />
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="field pr-11"
              placeholder="Enter your password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-400 hover:text-slate-700"
              onClick={() => setShowPassword((show) => !show)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldError message={errors.password?.message} />
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          <LogIn className="h-4 w-4" /> Sign in
        </Button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">
        New to NexaTask?{' '}
        <Link to="/register" className="font-semibold text-accent hover:text-blue-700">
          Create an account
        </Link>
      </p>
      <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        For this hackathon, the access token is stored in browser storage. Avoid using this strategy
        for high-risk production data without a hardened cookie-based session.
      </p>
    </AuthShell>
  );
}
