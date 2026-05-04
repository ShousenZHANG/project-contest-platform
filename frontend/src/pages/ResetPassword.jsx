/**
 * ResetPassword.jsx
 *
 * Allows users to reset their password using a secure token from the email link.
 * Validates the new password for strength and ensures confirmation matches.
 * On success the user is redirected to the homepage after a short delay.
 *
 * Migrated to shadcn/ui primitives + react-hook-form + zod + sonner toasts.
 * The original API contract (POST /users/reset-password { token, newPassword })
 * is preserved.
 */

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

import apiClient from '../api/apiClient';
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

const REDIRECT_DELAY_MS = 3000;

const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async ({ newPassword }) => {
    if (!token) {
      toast.error('Invalid or missing reset token.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/users/reset-password', { token, newPassword });
      toast.success('Password has been reset successfully!');
      setDone(true);
      setTimeout(() => navigate('/'), REDIRECT_DELAY_MS);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Reset failed. Please try again later.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left — branding hero */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_55%)] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-6 w-6" />
          Competition Platform
        </div>

        <div className="relative space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <KeyRound className="h-3.5 w-3.5" />
            Secure password reset
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Choose a new, strong password.
          </h2>
          <p className="text-white/80 text-base leading-relaxed">
            Use at least 8 characters with one uppercase letter and one number.
            We'll sign you back in once the change is saved.
          </p>
        </div>

        <p className="relative text-sm text-white/60">
          © {new Date().getFullYear()} Competition Platform
        </p>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md border-border/60 shadow-xl shadow-black/5">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-3xl font-bold tracking-tight">
              Reset your password
            </CardTitle>
            <CardDescription className="text-base">
              Enter your new password below.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {done ? (
              <div className="space-y-4 text-center py-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">Password updated</p>
                  <p className="text-sm text-muted-foreground">
                    Redirecting you to the homepage…
                  </p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="newPassword"
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 8 chars, 1 uppercase, 1 number"
                      aria-invalid={!!errors.newPassword}
                      className={cn(
                        'pl-9 pr-10 h-11',
                        errors.newPassword &&
                          'border-destructive focus-visible:ring-destructive'
                      )}
                      {...register('newPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      aria-label={
                        showNew ? 'Hide password' : 'Show password'
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNew ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-xs text-destructive">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repeat your new password"
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
                      aria-label={
                        showConfirm ? 'Hide password' : 'Show password'
                      }
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
                      Resetting…
                    </>
                  ) : (
                    <>
                      Reset password
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ResetPassword;
