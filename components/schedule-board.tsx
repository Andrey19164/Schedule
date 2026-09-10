'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Search, Sparkles, UserRound } from 'lucide-react'

type Lesson = {
  subject: string
  type: 'Лекция' | 'Практика' | 'Лабораторная'
  teacher: string
  room: string
}

type DaySchedule = {
  day: string
  lessons: Array<Lesson | null>
}

type WeekSchedule = {
  label: 'Четная' | 'Нечетная'
  days: DaySchedule[]
}

const times = [
  { number: '01', time: '09:00–10:30' },
  { number: '02', time: '10:40–12:10' },
  { number: '03', time: '12:20–13:50' },
  { number: '04', time: '14:30–16:00' },
  { number: '05', time: '16:10–17:40' },
]

const typeStyles = { Лекция: 'lecture', Практика: 'practice', Лабораторная: 'lab' } as const

function lessonWord(count: number) {
  if (count === 1) return 'занятие'
  if (count > 1 && count < 5) return 'занятия'
  return 'занятий'
}

function getMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes} мин ${String(seconds).padStart(2, '0')} сек`
}

function getMonday(date: Date) {
  const monday = new Date(date)
  const day = monday.getDay()
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getCurrentWeekLabel(date: Date): WeekSchedule['label'] {
  const currentMonday = getMonday(date)
  const referenceMonday = new Date(2026, 8, 7)
  const weeksSinceReference = Math.round((currentMonday.getTime() - referenceMonday.getTime()) / 604800000)
  return Math.abs(weeksSinceReference % 2) === 0 ? 'Четная' : 'Нечетная'
}

export function ScheduleBoard({ weeks }: { weeks: WeekSchedule[] }) {
  const [weekIndex, setWeekIndex] = useState(0)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [now, setNow] = useState<Date | null>(null)
  const [showWeek, setShowWeek] = useState(false)
  const week = weeks[weekIndex]

  useEffect(() => {
    const updateClock = () => {
      const currentTime = new Date()
      setNow(currentTime)
      const matchingIndex = weeks.findIndex((item) => item.label === getCurrentWeekLabel(currentTime))
      if (matchingIndex >= 0) {
        setCurrentWeekIndex(matchingIndex)
        setWeekIndex((previous) => (showWeek ? previous : matchingIndex))
      }
    }
    updateClock()
    const timer = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(timer)
  }, [weeks, showWeek])

  const currentDayIndex = now ? (now.getDay() + 6) % 7 : -1
  const currentMinutes = now ? now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 : -1
  const currentDay = currentDayIndex >= 0 ? week?.days[currentDayIndex] : undefined
  const activeLessonIndex = currentDay?.lessons.findIndex((lesson, index) => {
    if (!lesson) return false
    const [start, end] = times[index].time.split('–').map(getMinutes)
    return currentMinutes >= start && currentMinutes < end
  }) ?? -1
  const activeLesson = activeLessonIndex >= 0 ? currentDay?.lessons[activeLessonIndex] : null
  const activeEnd = activeLessonIndex >= 0 ? getMinutes(times[activeLessonIndex].time.split('–')[1]) : null
  const secondsUntilEnd = activeEnd === null ? null : Math.max(0, Math.ceil(activeEnd * 60 - currentMinutes * 60))
  const isViewingCurrentWeek = weekIndex === currentWeekIndex
  const todayLessons = currentDay?.lessons.filter(Boolean).length ?? 0
  const nextLessonIndex = currentDay?.lessons.findIndex((lesson, index) => Boolean(lesson) && currentMinutes < getMinutes(times[index].time.split('–')[0])) ?? -1
  const statusText = !isViewingCurrentWeek
    ? 'Откройте текущую неделю, чтобы увидеть статус'
    : activeLesson
      ? `Сейчас идет: ${activeLesson.subject}`
      : todayLessons === 0 || (nextLessonIndex === -1 && currentMinutes >= getMinutes(times[times.length - 1].time.split('–')[1]))
        ? 'На сегодня занятий нет'
        : 'Сейчас перерыв между парами'

  const filteredDays = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return week?.days ?? []
    return (week?.days ?? []).map((day) => ({
      ...day,
      lessons: day.lessons.map((lesson) => lesson && [lesson.subject, lesson.type, lesson.teacher, lesson.room].join(' ').toLowerCase().includes(normalized) ? lesson : null),
    }))
  }, [query, week])

  const renderDay = (day: DaySchedule, dayIndex: number) => {
    const filled = day.lessons.filter(Boolean).length
    const isToday = isViewingCurrentWeek && dayIndex === currentDayIndex
    return <article key={day.day} className={`overflow-hidden rounded-2xl border bg-card shadow-sm ${isToday ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`}>
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-4">
        <div><h2 className="text-lg font-bold">{day.day}</h2><p className="mt-0.5 text-xs text-muted-foreground">{filled ? `${filled} ${lessonWord(filled)}` : 'Свободный день'}</p></div>
        <span className={`text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{isToday ? 'Сегодня' : '2 п-г'}</span>
      </div>
      <div className="divide-y divide-border">
        {day.lessons.map((lesson, index) => {
          const isActive = isToday && index === activeLessonIndex && Boolean(lesson)
          const nextLesson = day.lessons[index + 1]
          return <div key={`${day.day}-${index}`}>
            <div className={`flex min-h-28 gap-3 px-4 py-4 ${lesson ? '' : 'opacity-55'}`}>
              <div className="w-14 shrink-0 pt-0.5"><div className={`text-lg font-bold leading-none ${isActive ? 'text-primary' : ''}`}>{times[index].number}</div><div className="mt-1 text-[11px] font-medium leading-4 text-muted-foreground">{times[index].time}</div></div>
              {lesson ? <div className={`min-w-0 flex-1 rounded-xl border-l-4 px-3 py-2 text-lesson-foreground ${typeStyles[lesson.type]} ${isActive ? 'relative ring-2 ring-primary/40 shadow-md' : ''}`}><div className="mb-1 flex items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-wide opacity-75">{isActive ? 'Идет сейчас' : lesson.type}</span><Clock3 size={14} className={`shrink-0 opacity-60 ${isActive ? 'animate-pulse' : ''}`} /></div><h3 className="text-sm font-bold leading-5">{lesson.subject}</h3><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><UserRound size={12} />{lesson.teacher}</span><span className="inline-flex items-center gap-1"><MapPin size={12} />{lesson.room}</span></div></div> : <div className="flex flex-1 items-center rounded-xl bg-muted/30 px-3 text-sm text-muted-foreground">Окно</div>}
            </div>
            {lesson && nextLesson && <div className="flex items-center gap-3 bg-muted/20 px-4 py-2 text-xs text-muted-foreground"><span className="w-14 shrink-0 text-center"><span className="mx-auto block h-px w-6 bg-border" /></span><Clock3 size={12} /><span>Перерыв · {index === 2 ? '30 минут' : '10 минут'}</span></div>}
          </div>
        })}
      </div>
    </article>
  }

  return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary"><span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><CalendarDays size={17} /></span>Учебный план</div><h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">Расписание занятий</h1><p className="mt-3 max-w-xl text-pretty text-base leading-6 text-muted-foreground">Группа 2141 · 2-я подгруппа</p></div><label className="relative block min-w-64"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Поиск по расписанию</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти предмет или аудиторию" className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label></header>
    <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-accent text-primary"><Sparkles size={19} /></div><div><p className="text-sm font-semibold">{week?.label} неделя</p><p className="text-sm text-muted-foreground">{showWeek ? 'Полное расписание недели' : now ? `Сегодня · ${currentDay?.day ?? ''}` : 'Расписание 2-й подгруппы'}</p></div></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setShowWeek(false)} className={`h-10 rounded-xl px-4 text-sm font-semibold transition ${!showWeek ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}>Сегодня</button><button type="button" onClick={() => setShowWeek(true)} className={`h-10 rounded-xl px-4 text-sm font-semibold transition ${showWeek ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}>Вся неделя</button><button type="button" aria-label="Предыдущая неделя" onClick={() => { setShowWeek(true); setWeekIndex((weekIndex + weeks.length - 1) % weeks.length) }} className="grid size-10 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"><ChevronLeft size={18} /></button><button type="button" onClick={() => { setShowWeek(false); setWeekIndex(currentWeekIndex) }} className="hidden h-10 rounded-xl border border-border px-4 text-sm font-semibold transition hover:bg-muted sm:block">Сейчас</button><button type="button" aria-label="Следующая неделя" onClick={() => { setShowWeek(true); setWeekIndex((weekIndex + 1) % weeks.length) }} className="grid size-10 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"><ChevronRight size={18} /></button></div></section>
    {!showWeek && <section className={`mb-5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${activeLesson && isViewingCurrentWeek ? 'border-primary/40 bg-primary/10' : 'border-border bg-card'}`} aria-live="polite"><div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-xl ${activeLesson && isViewingCurrentWeek ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><Clock3 size={18} /></span><div><p className="text-sm font-semibold">{statusText}</p>{activeLesson && <p className="mt-1 text-xs text-muted-foreground">{activeLesson.teacher} · {activeLesson.room}</p>}<p className="text-xs text-muted-foreground">{now ? now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '--:--'} · 2-я подгруппа</p></div></div>{activeLesson && isViewingCurrentWeek && secondsUntilEnd !== null ? <div className="text-left sm:text-right"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">До конца пары</p><p className="text-lg font-bold tabular-nums">{formatCountdown(secondsUntilEnd)}</p></div> : <p className="text-sm text-muted-foreground">{statusText === 'На сегодня занятий нет' ? 'До завтра' : 'Следующая пара по расписанию'}</p>}</section>}
    {showWeek ? <><div className="mb-5 flex items-center justify-between text-sm text-muted-foreground"><span>{filteredDays.reduce((total, day) => total + day.lessons.filter(Boolean).length, 0)} занятий</span><span className="hidden sm:block">Выделена пара, которая идет сейчас</span></div><section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{filteredDays.map((day, index) => renderDay(day, index))}</section></> : <section className="grid gap-4 md:grid-cols-2">{currentDay ? renderDay(currentDay, currentDayIndex) : <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">Сегодня расписания нет.</div>}</section>}
  </div></main>
}

export type { DaySchedule, Lesson, WeekSchedule }
export { times }
