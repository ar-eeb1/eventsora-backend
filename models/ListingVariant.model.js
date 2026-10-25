import mongoose from 'mongoose'
import './Listing.model.js'
import './Media.model.js'

const listingVariantSchema = new mongoose.Schema({
    listingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
    },
    title: String,
    startingPrice: Number,
    pricingType: String,
    minPersons: Number,
    media: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
    }],
}, { collection: 'listingvariants' })

const ListingVariantModel = mongoose.models.ListingVariant || mongoose.model('ListingVariant', listingVariantSchema)
export default ListingVariantModel
