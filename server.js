//  IMPORTS
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import connectDB from './config/db.js'
import { isAuthenticated } from './lib/authentication.js'
import ConversationModel from './models/Conversation.model.js'

//Import routes
import register from "./routes/auth/register.js"
import verifyEmail from "./routes/auth/verify-email.js"
import login from "./routes/auth/login.js"
import verifyOtp from "./routes/auth/verify-otp.js"
import shopProductOrders from "./routes/shop/productOrders.js"
import sellerProductOrders from "./routes/seller/productOrders.js"
import adminProductOrders from "./routes/admin/productOrders.js"


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


dotenv.config({ path: path.resolve(__dirname, '.env') })

connectDB()

const app = express()
const httpServer = createServer(app)
const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_FRONTEND_URL,
].filter(Boolean))
const isAllowedOrigin = (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true)
    return callback(new Error('Origin is not allowed by CORS.'))
}

app.use(cors({
    origin: isAllowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

app.use("/api/auth", register)
app.use("/api/auth", verifyEmail)
app.use("/api/auth", login)
app.use("/api/auth", verifyOtp)

const io = new Server(httpServer, {
    cors: {
        origin: isAllowedOrigin,
        credentials: true,
    },
})

app.set('io', io)
app.use('/api/shop', shopProductOrders)
app.use('/api/seller', sellerProductOrders)
app.use('/api/admin', adminProductOrders)

io.use(async (socket, next) => {
    const auth = await isAuthenticated({ headers: socket.handshake.headers })
    if (!auth.isAuth || auth.isExpired) {
        return next(new Error('Authentication required.'))
    }

    socket.data.userId = String(auth.userId)
    socket.data.role = auth.role
    return next()
})

io.on('connection', (socket) => {
    const emitSocketError = (message) => socket.emit('socket:error', { message })

    socket.on('join-chat', async (conversationId) => {
        if (!conversationId) return
        try {
            const canJoin = await ConversationModel.exists({
                _id: conversationId,
                participants: socket.data.userId,
            })
            if (!canJoin) return emitSocketError('You cannot access this conversation.')
            socket.join(`chat-${conversationId}`)
        } catch (error) {
            console.error('Socket conversation access check failed:', error)
            emitSocketError('Could not join this conversation.')
        }
    })

    socket.on('leave-chat', (conversationId) => {
        if (conversationId) socket.leave(`chat-${conversationId}`)
    })

    socket.on('join-user', (userId) => {
        if (!userId || String(userId) !== socket.data.userId) {
            return emitSocketError('You can only join your own user room.')
        }
        socket.join(`user-${socket.data.userId}`)
    })

    socket.on('join-admin', () => {
        if (!['admin', 'master'].includes(socket.data.role)) {
            return emitSocketError('Admin access required.')
        }
        socket.join('admins')
    })

    socket.on('leave-admin', () => {
        if (['admin', 'master'].includes(socket.data.role)) {
            socket.leave('admins')
        }
    })

    socket.on('message:new', async ({ conversationId, message } = {}) => {
        if (!conversationId || !message) return
        try {
            const canSend = await ConversationModel.exists({
                _id: conversationId,
                participants: socket.data.userId,
            })
            if (!canSend) return emitSocketError('You cannot send updates to this conversation.')
            io.to(`chat-${conversationId}`).emit('new-message', message)
        } catch (error) {
            console.error('Socket message authorization failed:', error)
            emitSocketError('Could not send this message update.')
        }
    })

    socket.on('conversation:update', async ({ userId, data } = {}) => {
        if (!userId || !data?.conversationId) return
        try {
            const canUpdate = await ConversationModel.exists({
                _id: data.conversationId,
                participants: { $all: [socket.data.userId, String(userId)] },
            })
            if (!canUpdate) return emitSocketError('You cannot update this conversation.')
            io.to(`user-${userId}`).emit('conversation-update', data)
        } catch (error) {
            console.error('Socket conversation update authorization failed:', error)
            emitSocketError('Could not send this conversation update.')
        }
    })
})



// SEND RESPONSE TO FRONT END
app.get('/', (req, res) => {
    res.send('API Is running')
})

// CREATE SERVER
httpServer.listen(5001, () => {
    console.log('Server is running on port 5001');
})