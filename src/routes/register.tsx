import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { AlertCircle, Eye, EyeOff, Loader2, Check } from 'lucide-react'

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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterForm>({
    defaultValues: {
      subscriptionTier: 'free',
    },
  })

  const watchPassword = watch('password')

  useEffect(() => {
    loadSubscriptionPlans()
  }, [loadSubscriptionPlans])

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate({ to: '/dashboard' })
    return null
  }

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      return
    }

    try {
      await registerUser({
        email: data.email,
        username: data.username,
        password: data.password,
        subscriptionTier: data.subscriptionTier,
      })
      navigate({ to: '/dashboard' })
    } catch (error) {
      // Error is handled by the store
    }
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '' }

    let strength = 0
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ]

    strength = checks.filter(Boolean).length

    const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][
      strength
    ]

    return { strength, text: strengthText }
  }

  const passwordStrength = getPasswordStrength(watchPassword)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Create Account
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Join WCDN to start using our CDN services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  {...register('username', {
                    required: 'Username is required',
                    minLength: {
                      value: 3,
                      message: 'Username must be at least 3 characters',
                    },
                    maxLength: {
                      value: 50,
                      message: 'Username must be less than 50 characters',
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9_-]+$/,
                      message:
                        'Username can only contain letters, numbers, hyphens, and underscores',
                    },
                  })}
                  className={errors.username ? 'border-red-500' : ''}
                />
                {errors.username && (
                  <p className="text-sm text-red-500">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    })}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {watchPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.strength <= 1
                              ? 'bg-red-500'
                              : passwordStrength.strength <= 3
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                          style={{
                            width: `${(passwordStrength.strength / 5) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {passwordStrength.text}
                      </span>
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) =>
                        value === watchPassword || 'Passwords do not match',
                    })}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscriptionTier">Subscription Plan</Label>
                <Select
                  onValueChange={(value) => setValue('subscriptionTier', value)}
                  defaultValue="free"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionPlans.map((plan) => (
                      <SelectItem key={plan.tier} value={plan.tier}>
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <div className="font-medium">{plan.name}</div>
                            <div className="text-sm text-gray-500">
                              ${plan.price}/month
                            </div>
                          </div>
                          {plan.tier === 'free' && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  You can upgrade or downgrade your plan anytime
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  {...register('acceptTerms', {
                    required: 'You must accept the terms and conditions',
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="acceptTerms" className="text-sm">
                  I accept the{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => window.open('/terms', '_blank')}
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => window.open('/privacy', '_blank')}
                  >
                    Privacy Policy
                  </button>
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="text-sm text-red-500">
                  {errors.acceptTerms.message}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Already have an account?{' '}
                <button
                  onClick={() => navigate({ to: '/login' })}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
