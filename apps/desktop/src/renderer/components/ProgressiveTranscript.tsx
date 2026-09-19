import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { TranscriptSegment } from "@oira/types"
import { useI18n } from "../i18n/I18nProvider"
import "./ProgressiveTranscript.css"

type Props = { segments: TranscriptSegment[]; immediate?: boolean }

export function ProgressiveTranscript({ segments, immediate = false }: Props) {
  // Equal results delivered again by IPC must not restart the presentation.
  // Key on ids + text lengths (not full JSON): cheap, stable for equal
  // content, and restarts only when the transcript actually changes.
  const stableKey = segments.map((segment) => `${segment.id}:${segment.text.length}`).join("|")
  return <TranscriptReveal key={stableKey} segments={segments} immediate={immediate} />
}

function TranscriptReveal({ segments, immediate }: Props) {
  const { t } = useI18n()
  const rows = useMemo(() => {
    let offset = 0
    return segments.map((segment) => {
      // Keep every original character, including whitespace and punctuation.
      const words = segment.text.match(/\s*\S+\s*|\s+/gu) ?? []
      const row = { segment, words, offset }
      offset += words.length
      return row
    })
  }, [segments])
  const words = useMemo(() => rows.flatMap((row) => row.words), [rows])
  const [count, setCount] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  const scroller = useRef<HTMLDivElement>(null)
  const following = useRef(true)
  const wordsLengthRef = useRef(words.length)
  wordsLengthRef.current = words.length
  const shown = immediate || reducedMotion ? words.length : count
  const revealing = shown < words.length

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => {
      setReducedMotion(media.matches)
      if (media.matches) setCount(wordsLengthRef.current)
    }
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (!revealing) return
    const batch = Math.min(3, Math.max(1, Math.ceil(words.length / 100)))
    const punctuation = /[.!?…][»”"')]*\s*$/u.test(words[count - 1] ?? "")
    const pace = Math.min(100, 6000 / Math.max(1, words.length))
    const timer = window.setTimeout(() => {
      setCount((current) => Math.min(words.length, current + batch))
    }, pace * batch * (punctuation ? 2 : 1))
    return () => window.clearTimeout(timer)
  }, [count, revealing, words])

  useLayoutEffect(() => {
    if (following.current && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight
    }
  }, [shown])

  return (
    <div className="progressive-transcript">
      <div className="progressive-transcript-toolbar">
        <span className="muted" role="status">
          {t(revealing ? "transcript.revealing" : "transcript.revealed")}
        </span>
        {revealing && (
          <button className="nl-button" type="button" onClick={() => setCount(words.length)}>
            {t("transcript.showAll")}
          </button>
        )}
      </div>
      <div
        ref={scroller}
        className="progressive-transcript-scroll"
        tabIndex={0}
        role="region"
        aria-label={t("processing.transcriptHeading")}
        aria-busy={revealing}
        onScroll={(event) => {
          const element = event.currentTarget
          following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 32
        }}
      >
        {rows.map(({ segment, words: rowWords, offset }) => {
          const visibleCount = Math.max(0, Math.min(rowWords.length, shown - offset))
          if (visibleCount === 0) return null
          const active = revealing && shown === offset + visibleCount
          return (
            <p key={segment.id} className="progressive-transcript-line">
              {segment.speaker && <><strong>{segment.speaker}</strong>{" "}</>}
              {rowWords.slice(0, visibleCount).map((word, index) => (
                <span key={index} className={revealing ? "progressive-transcript-word" : undefined}>{word}</span>
              ))}
              {active && <span className="progressive-transcript-cursor" aria-hidden="true" />}
            </p>
          )
        })}
      </div>
    </div>
  )
}
