const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        
        // Send existing users to the new user
        const existingUsers = rooms[roomId].map(user => user.userId);
        socket.emit('existing-users', existingUsers);
        
        // Add new user to room
        rooms[roomId].push({ socketId: socket.id, userId });

        // Notify existing users about new user
        socket.to(roomId).emit('user-connected', userId);
        
        console.log(`User ${userId} joined room ${roomId}. Room now has ${rooms[roomId].length} users.`);
    });

    socket.on('offer', (data) => {
        console.log(`Offer from ${data.caller} to ${data.target}`);
        // Find target user's socket ID
        for (const roomId in rooms) {
            const targetUser = rooms[roomId].find(user => user.userId === data.target);
            if (targetUser) {
                io.to(targetUser.socketId).emit('offer', {
                    caller: data.caller,
                    offer: data.offer
                });
                break;
            }
        }
    });

    socket.on('answer', (data) => {
        console.log(`Answer from ${data.caller} to ${data.target}`);
        // Find target user's socket ID
        for (const roomId in rooms) {
            const targetUser = rooms[roomId].find(user => user.userId === data.target);
            if (targetUser) {
                io.to(targetUser.socketId).emit('answer', {
                    caller: data.caller,
                    answer: data.answer
                });
                break;
            }
        }
    });

    socket.on('ice-candidate', (data) => {
        console.log(`ICE candidate from ${data.caller} to ${data.target}`);
        // Find target user's socket ID
        for (const roomId in rooms) {
            const targetUser = rooms[roomId].find(user => user.userId === data.target);
            if (targetUser) {
                io.to(targetUser.socketId).emit('ice-candidate', {
                    caller: data.caller,
                    candidate: data.candidate
                });
                break;
            }
        }
    });

    socket.on('audio-status', (data) => {
        console.log(`Audio status from ${data.userId}: ${data.isMuted ? 'muted' : 'unmuted'}`);
        // Update user audio status in room
        for (const roomId in rooms) {
            const user = rooms[roomId].find(user => user.userId === data.userId);
            if (user) {
                user.isMuted = data.isMuted;
                // Notify all other users in the room about the audio status change
                socket.to(roomId).emit('user-audio-status', {
                    userId: data.userId,
                    isMuted: data.isMuted
                });
                break;
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Find and remove user from all rooms
        for (const roomId in rooms) {
            const userIndex = rooms[roomId].findIndex(user => user.socketId === socket.id);
            if (userIndex !== -1) {
                const userId = rooms[roomId][userIndex].userId;
                rooms[roomId].splice(userIndex, 1);
                
                if (rooms[roomId].length === 0) {
                    delete rooms[roomId];
                } else {
                    socket.to(roomId).emit('user-disconnected', userId);
                }
                
                console.log(`User ${userId} left room ${roomId}`);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});