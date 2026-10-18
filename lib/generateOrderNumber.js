import OrderCounterModel from '../models/OrderCounter.model.js'

const ORDER_TIME_ZONE = 'Asia/Karachi'
const MAX_DAILY_ORDER_NUMBER = 99999

const getDateCode = (date) => {
    const parts = new Intl.DateTimeFormat('en', {
        timeZone: ORDER_TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
    return `${values.day}${values.month}${values.year}`
}

export const generateOrderNumber = async (date = new Date()) => {
    const dateCode = getDateCode(date)
    let counter

    try {
        counter = await OrderCounterModel.findOneAndUpdate(
            { dateCode },
            { $inc: { sequence: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        )
    } catch (error) {
        if (error.code !== 11000) throw error
        counter = await OrderCounterModel.findOneAndUpdate(
            { dateCode },
            { $inc: { sequence: 1 } },
            { new: true }
        )
    }

    if (!counter) throw new Error(`Could not allocate an order number for ${dateCode}.`)
    if (counter.sequence > MAX_DAILY_ORDER_NUMBER) {
        throw new Error(`Daily order number limit reached for ${dateCode}.`)
    }

    return `ES${dateCode}${String(counter.sequence).padStart(5, '0')}`
}
