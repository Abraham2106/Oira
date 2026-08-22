import type { ButtonHTMLAttributes, ReactNode } from "react"

type Variant = "secondary" | "primary" | "danger"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

const CLASS: Record<Variant, string> = {
  secondary: "nl-button",
  primary: "nl-button nl-button-primary",
  danger: "nl-button nl-button-danger",
}

export function Button({ variant = "secondary", children, type = "button", ...props }: Props) {
  return (
    <button type={type} className={CLASS[variant]} {...props}>
      {children}
    </button>
  )
}
