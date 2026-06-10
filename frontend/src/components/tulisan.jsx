function Highlighter({ action = 'highlight', color = '#87CEFA', children }) {
  if (action === 'underline') {
    return (
      <span className="relative inline-block whitespace-nowrap px-1">
        <span className="relative z-10">{children}</span>
        <span
          aria-hidden="true"
          className="absolute -bottom-1 left-0 right-0 h-[0.18em] -rotate-1 rounded-full"
          style={{ backgroundColor: color }}
        />
      </span>
    )
  }

  return (
    <span className="relative inline-block whitespace-nowrap px-1">
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-[0.05em] top-[0.12em] -rotate-1 rounded-[0.18em] opacity-80"
        style={{ backgroundColor: color }}
      />
    </span>
  )
}

export function HighlighterDemo() {
  return (
    <div className="animate-slideUp delay-[580ms] fill-mode-both">
      <p className="max-w-[680px] text-[18px] sm:text-[22px] leading-relaxed text-lp-text/80">
        Manage academic activities with{" "}
        <Highlighter action="underline" color="#FF9800">
          Student Hub
        </Highlighter>{" "}
        and receive automated reminders via{" "}
        <Highlighter action="highlight" color="#87CEFA">
          OpenClaw Reminder
        </Highlighter>{" "}
        in real-time.
      </p>
    </div>
  )
}
