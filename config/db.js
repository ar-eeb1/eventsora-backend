import mongoose from "mongoose"

let connectionPromise

const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI

    if (!mongoUri) {
        throw new Error("MONGO_URI or MONGODB_URI is not defined")
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection
    }

    if (!connectionPromise) {
        connectionPromise = mongoose.connect(mongoUri, {
            dbName: process.env.DB_NAME || 'EVENTSORA'
        }).catch((error) => {
            connectionPromise = null
            throw error
        })
    }

    return connectionPromise
}

export default connectDB