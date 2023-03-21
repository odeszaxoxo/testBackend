const express = require('express');
const http = require('http');

const app = express();
const { ExpressPeerServer } = require('peer');
const cors = require('cors');

app.use(
  cors({
    origin: '*',
  })
);
const server = http.createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
});

const opinions = {
  debug: true,
};

app.use('/peerjs', ExpressPeerServer(server, opinions));

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
