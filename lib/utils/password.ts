export interface PasswordStrength {
  score: number       // 0-4
  label: string       // Weak / Fair / Good / Strong
  color: string       // Tailwind color class
  requirements: PasswordRequirement[]
}

export interface PasswordRequirement {
  label: string
  met: boolean
}

/**
 * Check password strength and return detailed feedback
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const requirements: PasswordRequirement[] = [
    { label: 'At least 8 characters',              met: password.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'At least one number (0-9)',           met: /[0-9]/.test(password) },
    { label: 'At least one special character (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ]

  const metCount = requirements.filter(r => r.met).length

  const LEVELS = [
    { score: 0, label: 'Too Weak', color: 'text-red-500' },
    { score: 1, label: 'Weak',     color: 'text-red-400' },
    { score: 2, label: 'Fair',     color: 'text-amber-500' },
    { score: 3, label: 'Good',     color: 'text-blue-500' },
    { score: 4, label: 'Strong',   color: 'text-green-500' },
  ]

  const level = LEVELS[Math.min(metCount - 1, 4)] ?? LEVELS[0]

  return {
    score: metCount,
    label: metCount === 0 ? 'Too Weak' : level.label,
    color: metCount === 0 ? 'text-red-500' : level.color,
    requirements,
  }
}

/**
 * Returns true if password meets minimum requirements for submission
 */
export function isPasswordValid(password: string): boolean {
  const { requirements } = checkPasswordStrength(password)
  // Must meet at least: length + one case + one number = 3 requirements
  return requirements.filter(r => r.met).length >= 3 && password.length >= 8
}

/**
 * Bar color for strength indicator
 */
export function strengthBarColor(score: number): string {
  if (score <= 1) return 'bg-red-500'
  if (score === 2) return 'bg-amber-500'
  if (score === 3) return 'bg-blue-500'
  return 'bg-green-500'
}
