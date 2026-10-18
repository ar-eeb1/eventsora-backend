export const SHOP_DELIVERY_TIME_ZONE = 'Asia/Karachi'

const getZonedDateTime = (date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: SHOP_DELIVERY_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))

    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}`,
    }
}

const addCalendarDays = (date, days) => {
    const [year, month, day] = date.split('-').map(Number)
    const next = new Date(Date.UTC(year, month - 1, day + days))
    return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
}

export const isValidDeliveryDate = (date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false
    const [year, month, day] = date.split('-').map(Number)
    const parsed = new Date(Date.UTC(year, month - 1, day))
    return parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
}

export const getMinimumDeliverySlot = (items, now = new Date()) => {
    const nextMinute = new Date(Math.floor(now.getTime() / 60_000) * 60_000 + 60_000)
    const today = getZonedDateTime(now).date
    let minimum = getZonedDateTime(nextMinute)

    for (const item of items) {
        const value = Number(item.processingTime?.value) || 0
        if (value <= 0) continue

        const required = item.processingTime?.unit === 'hours'
            ? getZonedDateTime(new Date(nextMinute.getTime() + value * 60 * 60 * 1000))
            : { date: addCalendarDays(today, Math.ceil(value) + 1), time: '00:00' }

        if (`${required.date}T${required.time}` > `${minimum.date}T${minimum.time}`) {
            minimum = required
        }
    }

    return minimum
}
