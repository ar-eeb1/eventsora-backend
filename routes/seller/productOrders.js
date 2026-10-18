import { Router } from 'express'
import mongoose from 'mongoose'
import { isAuthenticated } from '../../lib/authentication.js'
import { catchError, escapeRegExp, response } from '../../lib/helperFunction.js'
import { productOrderNotification } from '../../email/productOrderNotification.js'
import { sendMail } from '../../lib/sendMail.js'
import { emitOrderEvent } from '../../lib/orderSocketEvents.js'
import ProductOrderModel from '../../models/ProductOrder.model.js'
import UserModel from '../../models/User.model.js'
import ConversationModel from '../../models/Conversation.model.js'

const router = Router()
const orderStatuses = ['pending', 'confirmed', 'accepted', 'preparing', 'ready_to_ship', 'shipped', 'fulfilled', 'rejected', 'cancelled']
const filterableFields = ['orderNumber', 'customerName', 'status', 'paymentStatus', 'totalAmount']
const sortableFields = ['orderNumber', 'customerName', 'totalAmount', 'status', 'paymentStatus', 'createdAt']
const nextStatuses = {
    confirmed: ['accepted', 'rejected'],
    accepted: ['preparing'],
    preparing: ['ready_to_ship'],
    ready_to_ship: ['shipped'],
    shipped: ['fulfilled'],
}
const allowedStatuses = Object.values(nextStatuses).flat()

const formatPrice = (amount) => new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
}).format(amount || 0)

const parseArrayParam = (value) => {
    if (!value) return []
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) throw new Error('Invalid table query parameters.')
    return parsed
}

router.get('/product-orders', async (req, res) => {
    try {
        const auth = await isAuthenticated(req, 'provider')
        if (!auth.isAuth || auth.isExpired) return response(res, false, 403, 'Unauthorized.')

        const start = Math.max(parseInt(req.query.start || '0', 10), 0)
        const size = Math.min(Math.max(parseInt(req.query.size || '10', 10), 1), 100)
        const filters = parseArrayParam(req.query.filters)
        const globalFilter = String(req.query.globalFilter || '')
        const sorting = parseArrayParam(req.query.sorting)
        const status = req.query.status
        if (status && !orderStatuses.includes(status)) return response(res, false, 400, 'Invalid order status.')

        const filter = { seller: auth.userId, releasedAt: { $ne: null } }
        if (status) filter.status = status

        if (globalFilter) {
            const searchPattern = { $regex: escapeRegExp(globalFilter), $options: 'i' }
            filter.$or = [
                { orderNumber: searchPattern },
                { customerName: searchPattern },
                { status: searchPattern },
                { paymentStatus: searchPattern },
                { 'items.productName': searchPattern },
            ]
        }

        filters.forEach(({ id, value }) => {
            if (!filterableFields.includes(id) || value === '') return
            if (id === 'status' && status) return
            if (id === 'totalAmount') {
                const amount = Number(value)
                if (Number.isFinite(amount)) filter[id] = amount
                return
            }
            filter[id] = { $regex: escapeRegExp(String(value)), $options: 'i' }
        })

        const sortQuery = {}
        sorting.forEach(({ id, desc }) => {
            if (sortableFields.includes(id)) sortQuery[id] = desc ? -1 : 1
        })

        const [orders, totalRowCount] = await Promise.all([
            ProductOrderModel.find(filter)
                .populate('buyer', 'name email')
                .sort(Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 })
                .skip(start)
                .limit(size)
                .lean(),
            ProductOrderModel.countDocuments(filter),
        ])

        return res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Seller orders fetched successfully.',
            data: orders,
            meta: { totalRowCount },
        })
    } catch (error) {
        return catchError(res, error)
    }
})

router.get('/product-orders/:orderId', async (req, res) => {
    try {
        const auth = await isAuthenticated(req, 'provider')
        if (!auth.isAuth || auth.isExpired) return response(res, false, 403, 'Unauthorized.')

        const { orderId } = req.params
        if (!mongoose.isValidObjectId(orderId)) return response(res, false, 400, 'Invalid order ID.')

        const order = await ProductOrderModel.findOne({
            _id: orderId,
            seller: auth.userId,
            releasedAt: { $ne: null },
        })
            .populate('buyer', 'name email phone')
            .populate({
                path: 'items.product',
                select: 'slug category',
                populate: { path: 'category', select: 'slug' },
            })
            .lean()
        if (!order) return response(res, false, 404, 'Order not found.')

        return response(res, true, 200, 'Order details fetched successfully.', order)
    } catch (error) {
        return catchError(res, error)
    }
})

router.post('/product-orders/:orderId', async (req, res) => {
    try {
        const auth = await isAuthenticated(req, 'provider')
        if (!auth.isAuth || auth.isExpired) return response(res, false, 403, 'Unauthorized.')

        const { orderId } = req.params
        if (!mongoose.isValidObjectId(orderId)) return response(res, false, 400, 'Invalid order ID.')
        const order = await ProductOrderModel.findOne({
            _id: orderId,
            seller: auth.userId,
            releasedAt: { $ne: null },
        }).select('orderNumber buyer seller items').lean()
        if (!order) return response(res, false, 404, 'Order not found.')
        const productId = order.items[0]?.product
        if (!productId) return response(res, false, 400, 'This order has no product to link to a conversation.')

        let conversation = await ConversationModel.findOne({
            participants: { $all: [order.seller, order.buyer] },
            productId,
            listingId: null,
        })
        if (!conversation) {
            conversation = await ConversationModel.create({
                participants: [order.seller, order.buyer],
                productId,
                listingId: null,
                lastMessage: `Started conversation about order ${order.orderNumber}`,
                lastMessageBy: auth.userId,
                isRead: false,
            })
        }

        return response(res, true, 200, 'Conversation ready.', { conversationId: conversation._id })
    } catch (error) {
        return catchError(res, error)
    }
})

router.patch('/product-orders/:orderId', async (req, res) => {
    try {
        const auth = await isAuthenticated(req, 'provider')
        if (!auth.isAuth || auth.isExpired) return response(res, false, 403, 'Unauthorized.')

        const { orderId } = req.params
        if (!mongoose.isValidObjectId(orderId)) return response(res, false, 400, 'Invalid order ID.')
        const { status } = req.body
        if (!allowedStatuses.includes(status)) return response(res, false, 400, 'Invalid order status.')

        const order = await ProductOrderModel.findOne({
            _id: orderId,
            seller: auth.userId,
            releasedAt: { $ne: null },
        })
        if (!order) return response(res, false, 404, 'Order not found.')
        if (!nextStatuses[order.status]?.includes(status)) {
            return response(res, false, 409, 'This order cannot be moved to that status.')
        }

        const updatedOrder = await ProductOrderModel.findOneAndUpdate(
            { _id: order._id, seller: auth.userId, releasedAt: { $ne: null }, status: order.status },
            { $set: { status } },
            { new: true }
        )
        if (!updatedOrder) return response(res, false, 409, 'This order was updated by someone else. Refresh and try again.')

        const buyer = await UserModel.findById(order.buyer).select('name email').lean()
        if (buyer?.email) {
            const result = await sendMail(
                `Order update: ${order.orderNumber}`,
                buyer.email,
                productOrderNotification({
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    customerEmail: order.customerEmail,
                    customerPhone: order.customerPhone,
                    shippingAddress: order.shippingAddress,
                    deliveryDate: order.deliveryDate,
                    deliveryTime: order.deliveryTime,
                    deliveryTimeZone: order.deliveryTimeZone,
                    note: order.note,
                    totalAmountFormatted: formatPrice(order.totalAmount),
                    status,
                    recipient: 'buyer',
                    recipientName: buyer.name || order.customerName,
                    items: order.items.map((item) => ({
                        productName: item.productName,
                        variantName: item.variantName,
                        quantity: item.quantity,
                        lineTotalFormatted: formatPrice(item.lineTotal),
                    })),
                })
            )
            if (!result.success) console.error(`Product order update email delivery failed for ${order.orderNumber}`)
        }

        const io = req.app.get('io')
        const eventPayload = emitOrderEvent(io, 'order:updated', order.buyer, updatedOrder)
        io.to(`user-${order.seller}`).emit('order:updated', eventPayload)
        io.to('admins').emit('order:updated', eventPayload)
        return response(res, true, 200, 'Order status updated successfully.')
    } catch (error) {
        return catchError(res, error)
    }
})

router.get('/dashboard', async (req, res) => {
    try {
        const auth = await isAuthenticated(req, 'provider')
        if (!auth.isAuth || auth.isExpired) return response(res, false, 403, 'Unauthorized.')

        const sellerId = new mongoose.Types.ObjectId(auth.userId)
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        const [summary, recentOrders] = await Promise.all([
            ProductOrderModel.aggregate([
                { $match: { seller: sellerId, releasedAt: { $ne: null } } },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalAmountThisMonth: {
                            $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, '$totalAmount', 0] },
                        },
                        pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                        deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] } },
                    },
                },
            ]),
            ProductOrderModel.find({ seller: sellerId, releasedAt: { $ne: null } })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('buyer', 'name')
                .lean(),
        ])

        const sellerSummary = summary[0] || {
            totalOrders: 0,
            totalAmountThisMonth: 0,
            pendingOrders: 0,
            deliveredOrders: 0,
        }

        return response(res, true, 200, 'Seller dashboard stats', {
            totalOrders: sellerSummary.totalOrders,
            totalAmountThisMonth: sellerSummary.totalAmountThisMonth || 0,
            pendingOrders: sellerSummary.pendingOrders || 0,
            deliveredOrders: sellerSummary.deliveredOrders || 0,
            newOrders: recentOrders.map((order) => ({
                _id: order._id,
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
                status: order.status,
                createdAt: order.createdAt,
                customerName: order.customerName || order.buyer?.name || 'Customer',
            })),
        })
    } catch (error) {
        return catchError(res, error)
    }
})

export default router
