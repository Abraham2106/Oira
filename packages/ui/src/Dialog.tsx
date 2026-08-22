import type { ReactNode } from "react"

type Props = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function Dialog({ open, title, children, onClose }: Props) {
  if (!open) return null

  return (
    <div className="nl-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="nl-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nl-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="nl-dialog-title" className="nl-card-title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
