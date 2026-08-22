import type { ReactNode } from "react"

type Props = {
  title?: string
  children: ReactNode
}

export function Card({ title, children }: Props) {
  return (
    <section className="nl-card">
      {title ? <h2 className="nl-card-title">{title}</h2> : null}
      {children}
    </section>
  )
}
