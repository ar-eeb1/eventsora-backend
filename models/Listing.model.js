import mongoose from 'mongoose'
import './Category.model.js'
import './Subcategory.model.js'
import './Media.model.js'

const listingSchema = new mongoose.Schema({
    name: String,
    slug: String,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subcategory',
    },
    media: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
    }],
    deletedAt: Date,
}, { collection: 'listings' })

const ListingModel = mongoose.models.Listing || mongoose.model('Listing', listingSchema)
export default ListingModel
