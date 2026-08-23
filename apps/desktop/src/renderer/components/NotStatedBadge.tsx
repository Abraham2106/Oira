import { useI18n } from "../i18n/I18nProvider"

type Reason = "not_stated" | "unknown"

type Props = {
  reason: Reason
}

export function NotStatedBadge({ reason }: Props) {
  const { t } = useI18n()
  return (
    <span className="nl-badge">
      {reason === "not_stated" ? t("notStated.notDocumented") : t("notStated.undetermined")}
    </span>
  )
}
