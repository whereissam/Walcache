import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, error, isAuthenticated } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  if (isAuthenticated) {
    navigate({ to: '/dashboard' })
    return null
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password)
      navigate({ to: '/dashboard' })
    } catch {
      // Error handled by store
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Sign in
          </h1>
          <p className="text-[14px] text-muted-foreground">
            Enter your credentials to access your account.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5">
            <p className="text-[13px] text-destructive">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px]">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="h-9 text-[14px]"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />
            {errors.email && (
              <p className="text-[12px] text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[13px]">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="h-9 text-[14px] pr-9"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Minimum 8 characters',
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[12px] text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="rememberMe"
              type="checkbox"
              {...register('rememberMe')}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="rememberMe" className="text-[13px] text-muted-foreground">
              Remember me
            </Label>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-9 text-[13px] font-medium">
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center text-[13px] text-muted-foreground">
          No account?{' '}
          <button
            onClick={() => navigate({ to: '/register' })}
            className="text-primary hover:text-primary/80 font-medium"
          >
            Create one
          </button>
        </div>
      </div>
    </div>
  )
}
