import { FLOW_STEPS, type FlowStepId } from "../lib/consultFlow"

type Props = {
  current: FlowStepId
}

export function FlowStepper({ current }: Props) {
  const currentIndex = FLOW_STEPS.findIndex((step) => step.id === current)

  return (
    <ol className="flow-stepper" aria-label="Progreso de la consulta">
      {FLOW_STEPS.map((step, index) => {
        const status = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo"
        return (
          <li key={step.id} className={`flow-step flow-step-${status}`}>
            <span className="flow-step-index" aria-hidden="true">
              {index + 1}
            </span>
            <span>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
