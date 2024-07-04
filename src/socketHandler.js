const socketIO = require('socket.io')

let io;

const initSocket = (server) => {
    io = socketIO(server);

    io.on('connection', (socket) => {
        console.log("Socket connected")

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
        
        socket.on('uploadProgress', (data) => {
            console.log('Upload progress from client:', data);
        });
        
        socket.on('uploadComplete', (data) => {
            console.log('Upload complete from client:', data);
        });
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