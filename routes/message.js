import { Router } from 'express'
import { isValidObjectId } from 'mongoose'
import connectDB from '../config/db.js'
import { isAuthenticated } from '../lib/authentication.js'
import { catchError, response } from '../lib/helperFunction.js'
import ConversationModel from '../models/Conversation.model.js'
import ListingModel from '../models/Listing.model.js'
import MessageModel from '../models/Message.model.js'
import ProductModel from '../models/Product.model.js'
import '../models/ListingVariant.model.js'

const router = Router()
const messageRoles = ['user', 'provider', 'admin']

const requireAuth = async (req, res, roles = messageRoles) => {
    const auth = await isAuthenticated(req, roles)
    if (!auth.isAuth || auth.isExpired) {
        response(res, false, 401, 'Unauthorized')
        return null
    }
    return auth
}

const getConversationForUser = async (conversationId, userId) => (
    ConversationModel.findOne({
        _id: conversationId,
        participants: userId,
    })
)

router.get('/conversation/get', async (req, res) => {
    try {
        const auth = await requireAuth(req, res)
        if (!auth) return

        await connectDB()
        const conversations = await ConversationModel.find({
            participants: auth.userId,
        })
            .populate('participants', 'name email profileImage avatar')
            .populate('lastMessageBy', 'name')
            .populate({
                path: 'listingId',
                select: 'name slug media userId',
                populate: [
                    { path: 'media', select: 'secure_url thumbnail_url alt title' },
                    { path: 'userId', select: 'name' },
                ],
            })
            .populate({
                path: 'productId',
                select: 'name slug category userId',
                populate: [
                    { path: 'category', select: 'slug' },
                    { path: 'userId', select: 'name' },
                ],
            })
            .sort({ updatedAt: -1 })
            .lean()

        return response(res, true, 200, 'Conversations fetched', conversations)
    } catch (error) {
        return catchError(res, error)
    }
})

router.post('/conversation/create', async (req, res) => {
    try {
        const auth = await requireAuth(req, res, ['user', 'provider'])
        if (!auth) return

        const { receiverId, listingId, productId } = req.body || {}
        if ([listingId, productId].filter(Boolean).length !== 1) {
            return response(res, false, 400, 'Provide exactly one listing or product.')
        }

        const targetId = listingId || productId
        if (!isValidObjectId(targetId)) {
            return response(res, false, 400, 'Invalid listing or product ID.')
        }

        await connectDB()
        let actualReceiverId = receiverId

        if (listingId) {
            const listing = await ListingModel.findOne({
                _id: listingId,
                deletedAt: null,
            }).select('userId').lean()
            if (!listing) return response(res, false, 404, 'Listing not found.')
            actualReceiverId = String(listing.userId)
        } else {
            const product = await ProductModel.findOne({
                _id: productId,
                status: 'approved',
                deletedAt: null,
            }).select('userId').lean()
            if (!product) return response(res, false, 404, 'Product not found.')
            actualReceiverId = String(product.userId)
        }

        if (!isValidObjectId(actualReceiverId)) {
            return response(res, false, 400, 'Invalid receiver ID.')
        }
        if (String(auth.userId) === String(actualReceiverId)) {
            return response(res, false, 400, 'You cannot message yourself.')
        }

        let conversation = await ConversationModel.findOne({
            participants: { $all: [auth.userId, actualReceiverId] },
            listingId: listingId || null,
            productId: productId || null,
        })

        if (!conversation) {
            conversation = await ConversationModel.create({
                participants: [auth.userId, actualReceiverId],
                listingId: listingId || null,
                productId: productId || null,
                lastMessage: 'Started conversation',
                lastMessageBy: auth.userId,
                isRead: false,
            })

            req.app.get('io').to(`user-${actualReceiverId}`).emit('conversation-update', {
                conversationId: String(conversation._id),
                lastMessage: conversation.lastMessage,
                updatedAt: conversation.updatedAt,
                isRead: false,
            })
        }

        return response(res, true, 200, 'Conversation Ready', conversation)
    } catch (error) {
        return catchError(res, error)
    }
})

router.get('/get/:conversationId', async (req, res) => {
    try {
        const auth = await requireAuth(req, res)
        if (!auth) return

        const { conversationId } = req.params
        if (!isValidObjectId(conversationId)) {
            return response(res, false, 400, 'Invalid Conversation ID')
        }

        await connectDB()
        const conversation = await getConversationForUser(conversationId, auth.userId)
        if (!conversation) return response(res, false, 404, 'Conversation not found.')

        const messages = await MessageModel.find({ conversationId })
            .sort({ createdAt: 1 })
            .populate('sender', 'name email profileImage avatar')
            .populate('readBy', 'name')
            .populate({
                path: 'quoteListingId',
                populate: [
                    { path: 'category', select: 'category' },
                    { path: 'subcategory', select: 'subcategory' },
                    { path: 'media', select: 'secure_url thumbnail_url alt title' },
                ],
            })
            .populate('quoteVariantId')

        return response(res, true, 200, 'Messages fetched', messages)
    } catch (error) {
        return catchError(res, error)
    }
})

router.post('/read', async (req, res) => {
    try {
        const auth = await requireAuth(req, res)
        if (!auth) return

        const { conversationId } = req.body || {}
        if (!isValidObjectId(conversationId)) {
            return response(res, false, 400, 'Invalid Conversation ID')
        }

        await connectDB()
        const conversation = await getConversationForUser(conversationId, auth.userId)
        if (!conversation) return response(res, false, 404, 'Conversation not found.')

        await MessageModel.updateMany(
            {
                conversationId,
                sender: { $ne: auth.userId },
                readBy: { $ne: auth.userId },
            },
            { $addToSet: { readBy: auth.userId } }
        )

        if (String(conversation.lastMessageBy) !== String(auth.userId)) {
            conversation.isRead = true
            await conversation.save()
        }

        return response(res, true, 200, 'Messages marked as read')
    } catch (error) {
        return catchError(res, error)
    }
})

router.post('/send', async (req, res) => {
    try {
        const auth = await requireAuth(req, res)
        if (!auth) return

        const {
            conversationId,
            text,
            isQuote,
            quotePrice,
            quoteListingId,
            quoteVariantId,
            quoteDate,
        } = req.body || {}

        if (!isValidObjectId(conversationId)) {
            return response(res, false, 400, 'Invalid Conversation ID')
        }
        if (typeof text !== 'string' || !text.trim()) {
            return response(res, false, 400, 'Empty Message')
        }
        if (quoteListingId && !isValidObjectId(quoteListingId)) {
            return response(res, false, 400, 'Invalid listing ID.')
        }
        if (quoteVariantId && !isValidObjectId(quoteVariantId)) {
            return response(res, false, 400, 'Invalid variant ID.')
        }
        if (isQuote && (!Number.isFinite(Number(quotePrice)) || Number(quotePrice) <= 0)) {
            return response(res, false, 400, 'A valid quote price is required.')
        }

        await connectDB()
        const conversation = await getConversationForUser(conversationId, auth.userId)
        if (!conversation) return response(res, false, 404, 'Conversation not found.')

        const message = await MessageModel.create({
            conversationId,
            sender: auth.userId,
            text: text.trim(),
            isQuote: Boolean(isQuote),
            quotePrice: isQuote ? Number(quotePrice) : null,
            quoteListingId: quoteListingId || null,
            quoteVariantId: quoteVariantId || null,
            quoteDate: quoteDate || null,
            readBy: [],
        })

        conversation.lastMessage = message.text
        conversation.lastMessageBy = auth.userId
        conversation.isRead = false
        await conversation.save()

        const populatedMessage = await MessageModel.findById(message._id)
            .populate('sender', 'name email profileImage avatar')
            .populate({
                path: 'quoteListingId',
                populate: [
                    { path: 'category', select: 'category' },
                    { path: 'subcategory', select: 'subcategory' },
                    { path: 'media', select: 'secure_url thumbnail_url alt title' },
                ],
            })
            .populate('quoteVariantId')

        const io = req.app.get('io')
        io.to(`chat-${conversationId}`).emit('new-message', populatedMessage)

        for (const participantId of conversation.participants) {
            if (String(participantId) !== String(auth.userId)) {
                io.to(`user-${participantId}`).emit('conversation-update', {
                    conversationId: String(conversationId),
                    lastMessage: message.text,
                    updatedAt: message.createdAt,
                    isRead: false,
                })
            }
        }

        return response(res, true, 200, 'Message Sent', populatedMessage)
    } catch (error) {
        return catchError(res, error)
    }
})

export default router
