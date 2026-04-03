import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

interface RegisterForm {
  email: string
  username: string
  password: string
  confirmPassword: string
  subscriptionTier: string
  acceptTerms: boolean
}

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const {
    register: registerUser,
    loading,
    error,
    isAuthenticated,
    subscriptionPlans,
    loadSubscriptionPlans,
  } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterForm>({ defaultValues: { subscriptionTier: 'free' } })

  const watchPassword = watch('password')

  useEffect(() => {
    loadSubscriptionPlans()
  }, [loadSubscriptionPlans])

  if (isAuthenticated) {
    navigate({ to: '/dashboard' })
    return null
  }

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) return
    try {
      await registerUser({
        email: data.email,
        username: data.username,
        password: data.password,
        subscriptionTier: data.subscriptionTier,
      })
      navigate({ to: '/dashboard' })
    } catch {
      // handled by store
    }
  }

  const getStrength = (pw: string) => {
    if (!pw) return 0
    return [pw.length >= 8, /[a-z]/.test(pw), /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length
  }

  const strength = getStrength(watchPassword)
  const strengthLabel = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength] || ''

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Create account</h1>
          <p className="text-[14px] text-muted-foreground">
            Start using the Walrus CDN in minutes.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5">
            <p className="text-[13px] text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px]">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="h-9 text-[14px]"
              {...register('email', {
                required: 'Required',
                pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' },
              })}
            />
            {errors.email && <p className="text-[12px] text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-[13px]">Username</Label>
            <Input
              id="username"
              placeholder="your-username"
              className="h-9 text-[14px]"
              {...register('username', {
                required: 'Required',
                minLength: { value: 3, message: 'Min 3 characters' },
                pattern: { value: /^[a-zA-Z0-9_-]+$/, message: 'Letters, numbers, hyphens, underscores only' },
              })}
            />
            {errors.username && <p className="text-[12px] text-destructive">{errors.username.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[13px]">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 characters"
                className="h-9 text-[14px] pr-9"
                {...register('password', {
                  required: 'Required',
                  minLength: { value: 8, message: 'Min 8 characters' },
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
            {watchPassword && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      strength <= 2 ? 'bg-destructive' : strength <= 3 ? 'bg-chart-2' : 'bg-primary'
                    }`}
                    style={{ width: `${(strength / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">{strengthLabel}</span>
              </div>
            )}
            {errors.password && <p className="text-[12px] text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-[13px]">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              className="h-9 text-[14px]"
              {...register('confirmPassword', {
                required: 'Required',
                validate: (v) => v === watchPassword || 'Passwords don\'t match',
              })}
            />
            {errors.confirmPassword && <p className="text-[12px] text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px]">Plan</Label>
            <Select onValueChange={(v) => setValue('subscriptionTier', v)} defaultValue="free">
              <SelectTrigger className="h-9 text-[14px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subscriptionPlans.map((plan) => (
                  <SelectItem key={plan.tier} value={plan.tier}>
                    {plan.name} — ${plan.price}/mo
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Change anytime</p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="acceptTerms"
              type="checkbox"
              {...register('acceptTerms', { required: 'Required' })}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="acceptTerms" className="text-[12px] text-muted-foreground">
              I accept the Terms of Service and Privacy Policy
            </Label>
          </div>
          {errors.acceptTerms && <p className="text-[12px] text-destructive">{errors.acceptTerms.message}</p>}

          <Button type="submit" disabled={loading} className="w-full h-9 text-[13px] font-medium">
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <div className="text-center text-[13px] text-muted-foreground">
          Have an account?{' '}
          <button onClick={() => navigate({ to: '/login' })} className="text-primary hover:text-primary/80 font-medium">
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}
