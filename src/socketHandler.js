const socketIO = require('socket.io')

let io;

const initSocket = (server) => {
    io = socketIO(server);

    io.on('connection', (socket) => {
        console.log("Socket connected")
    })

    // Handle socket event using socket.on()
}

const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized!');
      }
      return io;
}

module.exports = {
    initSocket,
    getIO
}