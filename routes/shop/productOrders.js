import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { isAuthenticated } from '../../lib/authentication.js'
import { catchError, response } from '../../lib/helperFunction.js'
import { sendMail } from '../../lib/sendMail.js'
import { productOrderNotification } from '../../email/productOrderNotification.js'
import { generateOrderNumber } from '../../lib/generateOrderNumber.js'
import { emitOrderEvent } from '../../lib/orderSocketEvents.js'
import { getMinimumDeliverySlot, isValidDeliveryDate, SHOP_DELIVERY_TIME_ZONE } from '../../lib/shopDelivery.js'
import ProductModel from '../../models/Product.model.js'
import ProductVariantModel from '../../models/ProductVariant.model.js'
import ProductOrderModel from '../../models/ProductOrder.model.js'

const router = Router()
const orderSchema = z.object({
    items: z.array(z.object({
        productId: z.string().length(24),
        variantId: z.string().length(24).nullable().optional(),
        quantity: z.coerce.number().int().min(1),
    })).min(1).max(40),
    customerName: z.string().trim().min(2).max(100),
    customerEmail: z.string().trim().email().max(254),
    customerPhone: z.string().trim().min(6).max(30),
    shippingAddress: z.string().trim().min(5).max(500),
    deliveryDate: z.string().refine(isValidDeliveryDate, 'Choose a valid delivery date.'),
    deliveryTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid delivery time.'),
    note: z.string().trim().max(1000).optional().default(''),
})
const deliverySlotSchema = z.object({
    items: z.array(z.object({
        productId: z.string().length(24),
        variantId: z.string().length(24).nullable().optional(),
    })).min(1).max(40),
})

const formatPrice = (amount) => new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
}).format(amount || 0)

router.post('/product-order/delivery-slot', async (req, res) => {
    try {
        const auth = await isAuthenticated(req, ['user', 'provider'])
        if (!auth.isAuth || auth.isExpired) return response(res, false, 401, 'Please sign in to continue.')

        const validation = deliverySlotSchema.safeParse(req.body)
        if (!validation.success) return response(res, false, 400, 'Invalid cart items.', validation.error)

        const uniqueItems = [...new Map(validation.data.items.map((item) => [
            `${item.productId}:${item.variantId || ''}`,
            item,
        ])).values()]
        const requirements = []

        for (const { productId, variantId } of uniqueItems) {
            if (!mongoose.isValidObjectId(productId) || (variantId && !mongoose.isValidObjectId(variantId))) {
                return response(res, false, 400, 'Invalid product or variant.')
            }

            const product = await ProductModel.findOne({ _id: productId, status: 'approved', deletedAt: null }).lean()
            if (!product) return response(res, false, 404, 'A product in your cart is no longer available.')

            const variant = variantId
                ? await ProductVariantModel.findOne({
                    _id: variantId,
                    product: product._id,
                    status: 'approved',
                    deletedAt: null,
                }).lean()
                : null
            if (variantId && !variant) return response(res, false, 404, 'A product option in your cart is no longer available.')

            requirements.push({
                stockType: variant?.stockType || product.stockType,
                processingTime: variant?.processingTime || product.processingTime,
            })
        }

        return response(res, true, 200, 'Earliest delivery slot calculated.', {
            minimumDelivery: getMinimumDeliverySlot(requirements),
            timeZone: SHOP_DELIVERY_TIME_ZONE,
        })
    } catch (error) {
        return catchError(res, error)
    }
})

router.post('/product-order', async (req, res) => {
    try {
        const auth = await isAuthenticated(req, ['user', 'provider'])
        if (!auth.isAuth || auth.isExpired) return response(res, false, 401, 'Please sign in to place an order.')

        const validation = orderSchema.safeParse(req.body)
        if (!validation.success) return response(res, false, 400, 'Invalid order details.', validation.error)

        const { items, customerName, customerEmail, customerPhone, shippingAddress, deliveryDate, deliveryTime, note } = validation.data
        const combinedItems = Object.values(items.reduce((groups, item) => {
            const key = `${item.productId}:${item.variantId || ''}`
            if (!groups[key]) groups[key] = { ...item }
            else groups[key].quantity += item.quantity
            return groups
        }, {}))
        const verifiedItems = []

        for (const item of combinedItems) {
            const { productId, variantId, quantity } = item
            if (!mongoose.isValidObjectId(productId) || (variantId && !mongoose.isValidObjectId(variantId))) {
                return response(res, false, 400, 'Invalid product or variant.')
            }

            const product = await ProductModel.findOne({ _id: productId, status: 'approved', deletedAt: null }).lean()
            if (!product) return response(res, false, 404, 'A product in your cart is no longer available.')
            if (String(product.userId) === String(auth.userId)) return response(res, false, 400, 'You cannot order your own product.')

            const variant = variantId
                ? await ProductVariantModel.findOne({
                    _id: variantId,
                    product: product._id,
                    status: 'approved',
                    deletedAt: null,
                }).lean()
                : null
            if (variantId && !variant) return response(res, false, 404, 'A product option in your cart is no longer available.')

            const minimumQuantity = product.minimumOrderQuantity || 1
            if (quantity < minimumQuantity) {
                return response(res, false, 400, `${product.name}: minimum order quantity is ${minimumQuantity}.`)
            }

            const stockType = variant?.stockType || product.stockType
            const stockQuantity = variant?.stockQuantity ?? product.stockQuantity
            if (stockType === 'in_stock' && (stockQuantity < 1 || quantity > stockQuantity)) {
                return response(res, false, 409, `${product.name}: requested quantity is not currently in stock.`)
            }

            const inquirePrice = variant?.inquirePrice ?? product.inquirePrice
            if (inquirePrice) return response(res, false, 400, `${product.name}: contact the seller for pricing before ordering.`)

            const basePrice = variant?.price ?? product.price
            const discountPercentage = variant?.discountPercentage ?? product.discountPercentage ?? 0
            const unitPrice = Math.round(basePrice * (1 - discountPercentage / 100) * 100) / 100
            verifiedItems.push({
                seller: String(product.userId),
                product: product._id,
                variant: variant?._id || null,
                productName: product.name,
                variantName: variant?.name || null,
                sku: variant?.sku || product.sku,
                quantity,
                unitPrice,
                discountPercentage,
                lineTotal: Math.round(unitPrice * quantity * 100) / 100,
                processingTime: variant?.processingTime || product.processingTime,
            })
        }

        const minimumDelivery = getMinimumDeliverySlot(verifiedItems)
        if (`${deliveryDate}T${deliveryTime}` < `${minimumDelivery.date}T${minimumDelivery.time}`) {
            return response(
                res,
                false,
                400,
                `This order needs more preparation time. Choose ${minimumDelivery.date} at ${minimumDelivery.time} or later (${SHOP_DELIVERY_TIME_ZONE}).`
            )
        }

        const itemsBySeller = verifiedItems.reduce((groups, item) => {
            groups[item.seller] ||= []
            groups[item.seller].push(item)
            return groups
        }, {})
        const orderDocuments = []
        for (const [seller, sellerItems] of Object.entries(itemsBySeller)) {
            orderDocuments.push({
                orderNumber: await generateOrderNumber(),
                buyer: auth.userId,
                seller,
                items: sellerItems.map((item) => ({
                    product: item.product,
                    variant: item.variant,
                    productName: item.productName,
                    variantName: item.variantName,
                    sku: item.sku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountPercentage: item.discountPercentage,
                    lineTotal: item.lineTotal,
                })),
                totalAmount: sellerItems.reduce((sum, item) => sum + item.lineTotal, 0),
                customerName,
                customerEmail,
                customerPhone,
                shippingAddress,
                deliveryDate,
                deliveryTime,
                deliveryTimeZone: SHOP_DELIVERY_TIME_ZONE,
                note,
            })
        }

        const orders = await ProductOrderModel.insertMany(orderDocuments)

        await Promise.all(orders.map(async (order) => {
            const result = await sendMail(
                `Order received: ${order.orderNumber}`,
                customerEmail,
                productOrderNotification({
                    orderNumber: order.orderNumber,
                    customerName,
                    customerEmail,
                    customerPhone,
                    shippingAddress,
                    deliveryDate: order.deliveryDate,
                    deliveryTime: order.deliveryTime,
                    deliveryTimeZone: order.deliveryTimeZone,
                    note,
                    totalAmountFormatted: formatPrice(order.totalAmount),
                    items: order.items.map((orderItem) => ({
                        productName: orderItem.productName,
                        variantName: orderItem.variantName,
                        quantity: orderItem.quantity,
                        lineTotalFormatted: formatPrice(orderItem.lineTotal),
                    })),
                    recipient: 'buyer',
                    recipientName: customerName,
                })
            )
            if (!result.success) console.error(`Product order email delivery failed for ${order.orderNumber}`)
        }))

        const io = req.app.get('io')
        orders.forEach((order) => {
            const eventPayload = emitOrderEvent(io, 'order:created', auth.userId, order)
            io.to('admins').emit('order:created', eventPayload)
        })

        return response(res, true, 201, 'Order placed successfully.', {
            orders: orders.map((order) => ({
                _id: order._id,
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
                status: order.status,
                deliveryDate: order.deliveryDate,
                deliveryTime: order.deliveryTime,
                deliveryTimeZone: order.deliveryTimeZone,
            })),
        })
    } catch (error) {
        return catchError(res, error)
    }
})

router.get('/user-orders', async (req, res) => {
    try {
        const auth = await isAuthenticated(req, ['user', 'provider'])
        if (!auth.isAuth || auth.isExpired) return response(res, false, 401, 'Please sign in to view your orders.')

        const orders = await ProductOrderModel.find({ buyer: auth.userId })
            .select('orderNumber seller items totalAmount status paymentStatus createdAt')
            .populate('seller', 'name')
            .sort({ createdAt: -1 })
            .lean()
        return response(res, true, 200, 'Orders fetched successfully.', orders)
    } catch (error) {
        return catchError(res, error)
    }
})

export default router
