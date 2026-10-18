import { Router } from 'express'
import mongoose from 'mongoose'
import { isAuthenticated } from '../../lib/authentication.js'
import { catchError, response } from '../../lib/helperFunction.js'
import { productOrderNotification } from '../../email/productOrderNotification.js'
import { sendMail } from '../../lib/sendMail.js'
import { emitOrderEvent } from '../../lib/orderSocketEvents.js'
import ProductOrderModel from '../../models/ProductOrder.model.js'
import UserModel from '../../models/User.model.js'

const router = Router()
const formatPrice = (amount) => new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
}).format(amount || 0)

router.get('/product-orders', async (req, res) => {
    try {
        const auth = await isAuthenticated(req, 'admin')
        if (!auth.isAuth || auth.isExpired) return response(res, false, 403, 'Unauthorized.')

        const reviewStatus = req.query.reviewStatus
        if (reviewStatus && !['pending', 'accepted', 'rejected'].includes(reviewStatus)) {
            return response(res, false, 400, 'Invalid order review status.')
        }

        const filter = {}
        if (reviewStatus === 'pending') {
            filter.$or = [
                { reviewStatus: 'pending' },
                { reviewStatus: { $exists: false }, status: 'pending', paymentStatus: 'pending' },
            ]
        } else if (reviewStatus) {
            filter.$or = [
                { reviewStatus },
                ...(reviewStatus === 'rejected'
                    ? [{ reviewStatus: { $exists: false }, status: 'rejected' }]
                    : reviewStatus === 'accepted'
                        ? [{ reviewStatus: { $exists: false }, releasedAt: { $ne: null } }]
                        : []),
            ]
        }

        const orders = await ProductOrderModel.find(filter)
            .populate('buyer', 'name email')
            .populate('seller', 'name email')
            .sort({ createdAt: -1 })
            .lean()
        return response(res, true, 200, 'Shop orders fetched successfully.', orders)
    } catch (error) {
        return catchError(res, error)
    }
})

router.patch('/product-orders/:orderId', async (req, res) => {
    try {
        const auth = await isAuthenticated(req, 'admin')
        if (!auth.isAuth || auth.isExpired) return response(res, false, 403, 'Unauthorized.')

        const { orderId } = req.params
        if (!mongoose.isValidObjectId(orderId)) return response(res, false, 400, 'Invalid order ID.')
        const { action } = req.body
        if (!['confirm-payment', 'reject'].includes(action)) {
            return response(res, false, 400, 'Choose whether to confirm payment or reject the order.')
        }

        const order = await ProductOrderModel.findOneAndUpdate(
            {
                _id: orderId,
                status: 'pending',
                paymentStatus: 'pending',
                $or: [{ reviewStatus: 'pending' }, { reviewStatus: { $exists: false } }],
            },
            action === 'confirm-payment'
                ? { $set: { paymentStatus: 'paid', status: 'confirmed', reviewStatus: 'accepted', releasedAt: new Date() } }
                : { $set: { status: 'rejected', reviewStatus: 'rejected' } },
            { new: true }
        )
        if (!order) {
            const exists = await ProductOrderModel.exists({ _id: orderId })
            if (!exists) return response(res, false, 404, 'Order not found.')
            return response(res, false, 409, 'This order has already been reviewed.')
        }

        const [buyer, seller] = await Promise.all([
            UserModel.findById(order.buyer).select('name email').lean(),
            UserModel.findById(order.seller).select('name email').lean(),
        ])
        const emailData = {
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
            items: order.items.map((item) => ({
                productName: item.productName,
                variantName: item.variantName,
                quantity: item.quantity,
                lineTotalFormatted: formatPrice(item.lineTotal),
            })),
        }

        const notifications = []
        if (buyer?.email) {
            notifications.push(sendMail(
                action === 'confirm-payment' ? `Order confirmed: ${order.orderNumber}` : `Order update: ${order.orderNumber}`,
                buyer.email,
                productOrderNotification({
                    ...emailData,
                    status: action === 'confirm-payment' ? 'confirmed' : 'rejected',
                    recipient: 'buyer',
                    recipientName: buyer.name || order.customerName,
                })
            ))
        }
        if (action === 'confirm-payment' && seller?.email) {
            notifications.push(sendMail(
                `New order ready to fulfill: ${order.orderNumber}`,
                seller.email,
                productOrderNotification({
                    ...emailData,
                    status: 'confirmed',
                    recipient: 'seller',
                    recipientName: seller.name || 'Seller',
                })
            ))
        }
        const results = await Promise.all(notifications)
        if (results.some((result) => !result.success)) {
            console.error(`Product order review email delivery failed for ${order.orderNumber}`)
        }

        const io = req.app.get('io')
        const statusPayload = emitOrderEvent(io, 'order:updated', order.buyer, order)
        io.to('admins').emit('order:updated', statusPayload)
        if (action === 'confirm-payment') {
            io.to(`user-${order.seller}`).emit('order:new', statusPayload)
        }

        return response(res, true, 200, action === 'confirm-payment'
            ? 'Payment confirmed and order released to the seller.'
            : 'Order rejected.')
    } catch (error) {
        return catchError(res, error)
    }
})

export default router
