/**
 * RegisterModal.jsx
 *
 * Renders the registration modal for the platform. Used from Hero/Navbar to
 * register a new account against POST /users/register. OAuth links to
 * GitHub/Google are preserved (window.location.href = /users/oauth/<provider>).
 *
 * Behavior preserved from the previous MUI/CSS implementation:
 *   - Validates name, email, password, confirmPassword
 *   - Posts to /users/register with the provided role
 *   - Logs the user in via AuthContext on success and redirects by role
 *
 * Migrated to shadcn/ui primitives + react-hook-form + zod + sonner toasts.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  X,
} from 'lucide-react';

import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
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

/**
 * Local register schema mirrors the original validation rules:
 *   - name required, min 1
 *   - valid email
 *   - password min 8, must include at least one uppercase
 *   - confirmPassword must match password
 */
const registerFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function GithubIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.082-.73.082-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.763-1.605-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.467-2.382 1.235-3.222-.123-.303-.535-1.524.117-3.176 0 0 1.008-.323 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.018.005 2.043.138 3.003.404 2.29-1.553 3.297-1.23 3.297-1.23.653 1.652.24 2.873.118 3.176.77.84 1.233 1.912 1.233 3.222 0 4.61-2.806 5.622-5.48 5.92.43.37.812 1.102.812 2.222 0 1.605-.014 2.898-.014 3.293 0 .32.216.694.825.576C20.565 21.795 24 17.297 24 12c0-6.63-5.373-12-12-12z" />
    </svg>
  );
}

function GoogleIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M12 11v2.99h7.69c-.31 1.85-2.36 5.42-7.69 5.42-4.63 0-8.4-3.83-8.4-8.55s3.77-8.55 8.4-8.55c2.63 0 4.4 1.12 5.41 2.08l3.69-3.55C18.59.95 15.6-.5 12 -.5 5.37 -.5 0 4.87 0 11.5S5.37 23.5 12 23.5c6.93 0 11.51-4.87 11.51-11.72 0-.79-.08-1.39-.18-1.99H12z"
      />
    </svg>
  );
}

function RegisterModal({ onClose, role }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async ({ name, email, password }) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/users/register', {
        name,
        email,
        password,
        role,
      });
      const data = res.data;

      login({
        userId: data.userId,
        email: data.email,
        role: data.role,
        accessToken: data.accessToken,
      });

      toast.success('Account created successfully');

      if (data.role === 'Participant') {
        navigate(`/profile/${data.email}`);
      } else if (data.role === 'Organizer') {
        navigate(`/OrganizerProfile/${data.email}`);
      } else {
        navigate('/');
      }

      if (typeof onClose === 'function') onClose();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Server error. Please try again later.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <Card className="w-full max-w-md border-border/60 shadow-xl shadow-black/5 backdrop-blur-sm relative my-8">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Create your account
          </CardTitle>
          <CardDescription className="text-base">
            Join as a{' '}
            <span className="font-medium text-foreground">
              {(role || 'participant').toString().toLowerCase()}
            </span>{' '}
            to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  aria-invalid={!!errors.name}
                  className={cn(
                    'pl-9 h-11',
                    errors.name &&
                      'border-destructive focus-visible:ring-destructive'
                  )}
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

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
                    errors.email &&
                      'border-destructive focus-visible:ring-destructive'
                  )}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 chars, 1 uppercase"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  aria-invalid={!!errors.confirmPassword}
                  className={cn(
                    'pl-9 pr-10 h-11',
                    errors.confirmPassword &&
                      'border-destructive focus-visible:ring-destructive'
                  )}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
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
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11"
              onClick={() => {
                window.location.href = `/users/oauth/github?role=${role}`;
              }}
            >
              <GithubIcon className="h-4 w-4" />
              GitHub
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11"
              onClick={() => {
                window.location.href = `/users/oauth/google?role=${role}`;
              }}
            >
              <GoogleIcon className="h-4 w-4" />
              Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterModal;
