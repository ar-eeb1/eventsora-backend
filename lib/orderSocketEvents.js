export const emitOrderEvent = (io, event, userId, order) => {
    const payload = {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
    }

    if (userId) io.to(`user-${userId}`).emit(event, payload)
    return payload
}
