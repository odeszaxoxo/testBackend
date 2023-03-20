/* eslint-disable func-names */
const express = require('express');
const http = require('http');

const app = express();
const cors = require('cors');

app.use(cors());

const allowCrossDomain = function (req, res) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
};

app.configure(function () {
  app.use(allowCrossDomain);
});
const server = http.createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
});

const users = {};

const socketToRoom = {};

io.on('connection', (socket) => {
  socket.on('join room', (roomID) => {
    if (users[roomID]) {
      const { length } = users[roomID];

      // if 4 people have joined already, alert that room is full
      if (length === 2) {
        socket.emit('room full');
        return;
      }
      users[roomID].push(socket.id);
    } else {
      users[roomID] = [socket.id];
    }

    // returning new room with all the attendees after new attendee joined
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

  // signal recieved by the user who joined
  socket.on('returning signal', (payload) => {
    io.to(payload.callerID).emit('receiving returned signal', {
      signal: payload.signal,
      id: socket.id,
    });
  });

  // handling user disconnect in group call
  socket.on('disconnect', () => {
    // getting the room array with all the participants
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];

    if (room) {
      // finding the person who left the room
      // creating a new array with the remaining people
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
    }

    // emiting a signal and sending it to everyone that a user left
    socket.broadcast.emit('user left', socket.id);
  });
});

server.listen(() => console.log('server is running'));
