const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://closingtagrequired.online", // your IONOS frontend domain
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinGame', () => {
    let room = Object.keys(rooms).find(r => rooms[r].length < 2);
    if (!room) {
      room = socket.id;
      rooms[room] = [];
    }
    rooms[room].push(socket.id);
    socket.join(room);
    socket.roomId = room;

    const playerNumber = rooms[room].length;
    socket.emit('playerNumber', playerNumber);

    if (rooms[room].length === 2) {
      io.to(room).emit('startGame');
    }
  });

  socket.on('roll', () => {
    const roll = Math.floor(Math.random() * 6) + 1;
    io.to(socket.roomId).emit('rolled', roll, socket.id);
  });

  socket.on('placeDie', (col, roll, playerNum) => {
    const room = socket.roomId;
    socket.to(room).emit('opponentMove', col, roll, playerNum);
    socket.to(room).emit('yourTurn');
  });

  socket.on('disconnect', () => {
    const room = socket.roomId;
    if (room && rooms[room]) {
      rooms[room] = rooms[room].filter(id => id !== socket.id);
      if (rooms[room].length === 0) delete rooms[room];
      socket.to(room).emit('opponentLeft');
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
