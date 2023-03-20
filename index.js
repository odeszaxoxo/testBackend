/* eslint-disable func-names */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const port = process.env.PORT || 10000;

const app = express();
const cors = require('cors');

app.use(cors());

app.get('/test', function (req, res) {
  res.json({ msg: 'test' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
  transports: ['websocket', 'polling', 'flashsocket'],
});

const users = {};

const socketToRoom = {};

io.on('connection', (socket) => {
  socket.on('join room', (roomID) => {
    console.log('user joined');
    if (users[roomID]) {
      const { length } = users[roomID];

      if (length === 2) {
        socket.emit('room full');
        return;
      }
      users[roomID].push(socket.id);
    } else {
      users[roomID] = [socket.id];
    }

    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);
    socket.emit('all users', usersInThisRoom);
  });

  socket.on('sending signal', (payload) => {
    io.to(payload.userToSignal).emit('user joined', {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on('msgUser', ({ name, msg, sender }) => {
    const roomID = socketToRoom[socket.id];
    console.log('message', name, msg, sender, roomID, socket.id);
    io.to(roomID).emit('msgRcv', { name, msg, sender });
    socket.broadcast.emit('msgRcv', { name, msg, sender });
  });

  socket.on('returning signal', (payload) => {
    io.to(payload.callerID).emit('receiving returned signal', {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on('disconnect', () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];

    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
    }

    socket.broadcast.emit('user left', socket.id);
  });
});

server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
