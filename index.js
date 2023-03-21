const express = require('express');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
});
const { ExpressPeerServer } = require('peer');

const opinions = {
  debug: true,
};

app.use('/peerjs', ExpressPeerServer(server, opinions));
app.use(express.static('public'));

io.on('connection', (socket) => {
  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);
    setTimeout(() => {
      socket.to(roomId).broadcast.emit('user-connected', userId);
    }, 1000);
    socket.on('message', (message) => {
      io.to(roomId).emit('createMessage', message, userName);
    });
  });
});

server.listen(process.env.PORT || 3030);
