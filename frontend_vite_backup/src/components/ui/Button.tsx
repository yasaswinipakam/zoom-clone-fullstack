/**
 * Button — reusable interactive action primitive.
 *
 * Constitution §4.1: Feature components use this; never hand-style <button>.
 * Constitution §2.6: Default export, one component per file.
 * Constitution §2.4: Props typed via named interface.
 * Constitution §9.1: No arbitrary Tailwind values — all classes from token scale.
 * Constitution §4.5 / §12.1: Real <button> element, keyboard-operable, visible focus.
 *
 * Variants:
 *   primary      — solid primary blue, used for primary CTAs
 *   secondary    — solid white with border, used on light backgrounds
 *   danger       — solid red, used for destructive actions (leave, end, remove)
 *   ghost        — transparent + primary border, used on light backgrounds
 *   outline      — transparent + white border + white text, used on dark backgrounds
 *
 * Sizes: sm | md | lg
 * States: default | loading (replaces children with spinner) | disabled
 * Slots: optional leadingIcon rendered left of text
 */

import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leadingIcon?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-600 focus-visible:ring-primary shadow-sm',
  secondary:
    'bg-white text-slate-700 border border-border hover:bg-surface-50 focus-visible:ring-slate-400 shadow-sm',
  danger:
    'bg-danger text-white hover:bg-danger-600 focus-visible:ring-danger shadow-sm',
  ghost:
    'bg-transparent text-primary border border-primary hover:bg-primary-100 focus-visible:ring-primary',
  outline:
    'bg-transparent text-white border border-white/60 hover:bg-white/10 focus-visible:ring-white/50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-10 px-5 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
}

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leadingIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={clsx(
        // Base — layout, typography, transition
        'inline-flex items-center justify-center font-medium whitespace-nowrap',
        'transition-all duration-150',
        // Focus ring base (color set per variant above)
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        // Disabled state
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Variant + size
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        // Spinner — replaces icon and/or content during pending state
        <svg
          className={clsx('animate-spin shrink-0', iconSizeClasses[size])}
          aria-hidden="true"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : leadingIcon != null ? (
        <span className={clsx('shrink-0', iconSizeClasses[size])} aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  )
}
