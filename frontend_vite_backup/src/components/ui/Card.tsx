/**
 * Card — reusable surface primitive.
 *
 * Base surface used by MeetingCard (Task 3) and FeatureCard (this task).
 * Constitution §5.2: lives in ui/ because it has zero knowledge of any
 * specific feature's data — pure presentation surface.
 * Constitution §4.1: Feature components compose this; never style a raw <div>.
 */

import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle lift + border-color transition on hover. */
  isHoverable?: boolean
  /** Removes default padding — caller controls internal spacing. */
  noPadding?: boolean
}

export default function Card({
  isHoverable = false,
  noPadding = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        // Base surface
        'rounded-xl border border-border bg-white',
        // Shadow (CSS variable — shadow utilities not from @theme scale)
        'shadow-sm',
        // Padding
        !noPadding && 'p-6',
        // Hover state (opt-in)
        isHoverable && [
          'transition-all duration-200 cursor-pointer',
          'hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30',
        ],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
