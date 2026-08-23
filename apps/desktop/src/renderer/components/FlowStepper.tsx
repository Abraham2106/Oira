import { FLOW_STEPS, type FlowStepId } from "../lib/consultFlow"
import { useI18n } from "../i18n/I18nProvider"

type Props = {
  current: FlowStepId
}

export function FlowStepper({ current }: Props) {
  const { t } = useI18n()
  const currentIndex = FLOW_STEPS.findIndex((step) => step.id === current)

  return (
    <ol className="flow-stepper" aria-label={t("flow.aria")}>
      {FLOW_STEPS.map((step, index) => {
        const status = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo"
        return (
          <li key={step.id} className={`flow-step flow-step-${status}`}>
            <span className="flow-step-index" aria-hidden="true">
              {index + 1}
            </span>
            <span>{t(`flow.${step.id}`)}</span>
          </li>
        )
      })}
    </ol>
  )
}
