import mongoose from 'mongoose'

const orderCounterSchema = new mongoose.Schema({
    dateCode: { type: String, required: true, unique: true },
    sequence: { type: Number, required: true, default: 0 },
}, { collection: 'ordercounters' })

const OrderCounterModel = mongoose.models.OrderCounter
    || mongoose.model('OrderCounter', orderCounterSchema)
export default OrderCounterModel
