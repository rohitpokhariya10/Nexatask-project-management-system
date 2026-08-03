import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, FieldError, RequiredMark } from '../../components/common/ui';
import { useAuth } from '../../features/auth/auth-context';
import { registerSchema, type RegisterValues } from '../../features/auth/schemas';
import { getApiError } from '../../lib/api';
import { AuthShell } from './AuthShell';

export function RegisterPage() {
  const { register: createAccount, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  const submit = handleSubmit(async (values) => {
    try {
      await createAccount(values);
      toast.success('Your account is ready.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(getApiError(error, 'Unable to create your account.'));
    }
  });

  return (
    <AuthShell
      title="Create your account"
      description="Join your CountryEdu team with a Team Member account."
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <label className="field-label" htmlFor="name">
            Full name
            <RequiredMark />
          </label>
          <input
            id="name"
            className="field"
            autoComplete="name"
            placeholder="Your full name"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          <FieldError message={errors.name?.message} />
        </div>
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
              autoComplete="new-password"
              className="field pr-11"
              placeholder="At least 8 characters"
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
          <UserPlus className="h-4 w-4" /> Create account
        </Button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent hover:text-blue-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
