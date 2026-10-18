import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    lastMessage: { type: String },
    lastMessageBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isRead: { type: Boolean, default: false },
}, { timestamps: true, collection: 'conversations' })

conversationSchema.pre('validate', function () {
    if ([this.listingId, this.productId].filter(Boolean).length !== 1) {
        throw new Error('A conversation must be linked to exactly one listing or product.')
    }
})

const ConversationModel = mongoose.models.Conversation
    || mongoose.model('Conversation', conversationSchema)
export default ConversationModel
