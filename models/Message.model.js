import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    text: {
        type: String,
        required: true,
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    isQuote: {
        type: Boolean,
        default: false,
    },
    quotePrice: {
        type: Number,
        default: null,
    },
    quoteListingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        default: null,
    },
    quoteVariantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ListingVariant',
        default: null,
    },
    quoteDate: {
        type: String,
        default: null,
    },
}, { timestamps: true, collection: 'messages' })

const MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema)
export default MessageModel
