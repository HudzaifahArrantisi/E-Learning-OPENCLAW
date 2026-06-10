import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const notifications = [
  {
    icon: '⏰',
    title: 'Reminder TI 07-12 · 2 Hari Lagi',
    description: '📖 [MANAJEMEN PROYEK] Tugas Responsi Ke-4 - Software Development Plan [TEMPLATE] · 21 May 2026 23:00 (👥 119 mhs belum). Jangan lupa kumpulkan tugasmu! 📥',
    time: '06:59',
    accent: 'bg-lp-accent',
  },
  {
    icon: '⏰',
    title: 'Reminder TI 07-12 · BESOK!',
    description: '1. !!! BESOK! 📖 [MANAJEMEN PROYEK] Tugas Responsi Ke-4 [TEMPLATE] · 21 May 2026 23:00 (👥 119 mhs belum). Jangan lupa kumpulkan tugasmu! 📥',
    time: '06:59',
    accent: 'bg-lp-amber',
  },
  {
    icon: '⏰',
    title: 'Reminder TI 07-12 · HARI INI!',
    description: '1. !!!! HARI INI! ‼️ 📖 [MANAJEMEN PROYEK] Tugas Responsi Ke-4 [TEMPLATE] · 21 May 2026 23:00 (👥 119 mhs belum). Jangan lupa kumpulkan tugasmu! 📥',
    time: '06:59',
    accent: 'bg-lp-red',
  },
  {
    icon: '📚',
    title: 'Reminder TI 07-12 · TUGAS BARU!',
    description: '📚 TUGAS BARU! Silakan periksa dashboard atau grup untuk detail tugas terbaru.',
    time: '07:15',
    accent: 'bg-lp-green',
  },
]

export default function TelegramAnimatedNotifications() {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisibleCount(current => current + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  const visibleNotifications = Array.from(
    { length: Math.min(visibleCount, notifications.length) },
    (_, offset) => {
      const sequenceIndex = visibleCount - offset - 1
      return {
        ...notifications[sequenceIndex % notifications.length],
        sequenceIndex,
      }
    }
  )

  return (
    <div className="relative h-[320px] overflow-hidden bg-lp-surface">
      <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(38,165,228,0.12)_0,transparent_32%),radial-gradient(circle_at_80%_70%,rgba(75,115,255,0.1)_0,transparent_35%)]" />
      <div className="relative flex h-full flex-col px-3 py-3 sm:px-4">
        <div className="mb-3 flex justify-center">
          <span className="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-lp-text3 shadow-sm backdrop-blur">
            Today
          </span>
        </div>
        <div className="flex flex-col gap-2.5" aria-live="polite">
        <AnimatePresence initial={false}>
          {visibleNotifications.map(notification => (
            <motion.article
              layout
              initial={{ opacity: 0, y: -36, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              key={notification.sequenceIndex}
              className="relative max-w-[92%] shrink-0 self-start overflow-hidden rounded-2xl rounded-bl-[5px] border border-white/80 bg-lp-card/95 px-3 py-2.5 pl-3.5 text-lp-text shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${notification.accent}`} />
              <div className="flex items-start gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-lp-border bg-lp-surface text-[13px] shadow-sm">
                  {notification.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[11.5px] font-semibold leading-tight text-lp-text">
                    {notification.title}
                  </h3>
                  <p className="mt-1 text-[10.5px] font-light leading-relaxed text-lp-text2">
                    {notification.description}
                  </p>
                  <time className="mt-1 block text-right font-mono text-[8.5px] text-lp-text3">
                    {notification.time}
                  </time>
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-lp-surface via-lp-surface/90 to-transparent" />
    </div>
  )
}
