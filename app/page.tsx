import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { read, utils } from 'xlsx'
import { ScheduleBoard, type Lesson, type WeekSchedule } from '@/components/schedule-board'

function parseLesson(value: unknown): Lesson | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const [type, subject, details = ''] = value.split('\n')
  const [teacher = 'Преподаватель', room = 'Аудитория не указана'] = details.split(' • ')
  if (type !== 'Лекция' && type !== 'Практика' && type !== 'Лабораторная') return null
  return { type, subject, teacher, room }
}

async function getSchedule(): Promise<WeekSchedule[]> {
  const file = await readFile(path.join(process.cwd(), 'data/raspisanie_2141_po_podgruppam-de6875.xlsx'))
  const workbook = read(file, { type: 'buffer' })
  const rows = utils.sheet_to_json<unknown[]>(workbook.Sheets['2 п-г'], { header: 1, defval: null })
  const weeks: WeekSchedule[] = []

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    if (row?.[0] !== 'Четная неделя' && row?.[0] !== 'Нечетная неделя') continue
    const days: WeekSchedule['days'] = []
    for (const dayRow of rows.slice(index + 2, index + 8)) {
      if (typeof dayRow?.[0] !== 'string') continue
      days.push({ day: dayRow[0], lessons: dayRow.slice(1, 6).map(parseLesson) })
    }
    weeks.push({ label: row[0] === 'Четная неделя' ? 'Четная' : 'Нечетная', days })
  }
  return weeks
}

export default async function Page() {
  const weeks = await getSchedule()
  return <ScheduleBoard weeks={weeks} />
}
