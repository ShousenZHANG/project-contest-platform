/**
 * Login.jsx
 *
 * Renders the login experience for the platform. Supports two modes:
 *   1. Modal (used from Hero/Navbar/ContestDetail) — pass `onClose`, `onShowRegister`, and `role`
 *   2. Full page (mounted at `/login`) — no props; uses the centered split layout
 *
 * Behavior preserved from the previous MUI/CSS implementation:
 *   - POST /users/login with { email, password, role }
 *   - Forgot-password POST /users/forgot-password?email=...
 *   - Routes user to dashboard based on role (Admin / Organizer / Participant)
 *   - Honors location.state.from for return-to-page after login
 *
 * Migrated to shadcn/ui primitives + react-hook-form + zod + sonner toasts.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  X,
  Trophy,
  Sparkles,
} from 'lucide-react';

import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { loginSchema } from '../shared/schemas/userSchema';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { cn } from '../lib/utils';

const DEFAULT_ROLE = 'PARTICIPANT';

function LoginForm({ role: roleProp, onClose, onShowRegister }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const isModal = typeof onClose === 'function';
  const role = (roleProp || DEFAULT_ROLE).toString();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPending, setForgotPending] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/users/login', {
        email,
        password,
        role: role.toUpperCase(),
      });
      const data = res.data;

      login({
        userId: data.userId,
        email: data.email,
        role: data.role,
        accessToken: data.accessToken,
      });

      toast.success('Signed in successfully');

      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (data.role === 'Admin') {
        navigate('/AdminDashboard');
      } else if (data.role === 'Organizer') {
        navigate(`/OrganizerDashboard/${data.email}`);
      } else if (data.role === 'Participant') {
        navigate(`/profile/${data.email}`);
      } else {
        navigate('/');
      }

      if (isModal) onClose();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Login failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = getValues('email');
    if (!email) {
      toast.error('Please enter your email first');
      return;
    }
    setForgotPending(true);
    try {
      await apiClient.post(
        `/users/forgot-password?email=${encodeURIComponent(email)}`,
        null,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      toast.success('Reset link sent to your email');
    } catch (err) {
      toast.error('Unable to send reset link. Please check the email.');
    } finally {
      setForgotPending(false);
    }
  };

  const handleRegisterClick = () => {
    if (isModal && typeof onShowRegister === 'function') {
      onShowRegister();
    } else {
      navigate('/');
    }
  };

  // The card is the same in modal and page mode; the wrapper differs.
  const FormCard = (
    <Card className="w-full max-w-md border-border/60 shadow-xl shadow-black/5 backdrop-blur-sm relative">
      {isModal && (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <CardHeader className="space-y-2 pb-6">
        <CardTitle className="text-3xl font-bold tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription className="text-base">
          Sign in to your{' '}
          <span className="font-medium text-foreground">{role.toLowerCase()}</span>{' '}
          account to continue
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                aria-invalid={!!errors.email}
                className={cn(
                  'pl-9 h-11',
                  errors.email && 'border-destructive focus-visible:ring-destructive'
                )}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotPending}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-60"
              >
                {forgotPending ? 'Sending…' : 'Forgot password?'}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                className={cn(
                  'pl-9 pr-10 h-11',
                  errors.password &&
                    'border-destructive focus-visible:ring-destructive'
                )}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-11 mt-2 group"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={handleRegisterClick}
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </button>
        </p>
      </CardContent>
    </Card>
  );

  // Modal wrapper — overlay + centered card
  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {FormCard}
      </div>
    );
  }

  // Full-page wrapper — split hero/form layout
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left — branding hero */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_55%)] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-6 w-6" />
          Competition Platform
        </div>

        <div className="relative space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Built for organizers, judges, and participants
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Run hackathons and innovation challenges from one place.
          </h2>
          <p className="text-white/80 text-base leading-relaxed">
            Manage registrations, scoring, awards, and the participant
            experience — without juggling spreadsheets.
          </p>
        </div>

        <p className="relative text-sm text-white/60">
          © {new Date().getFullYear()} Competition Platform
        </p>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        {FormCard}
      </div>
    </div>
  );
}

export default LoginForm;
