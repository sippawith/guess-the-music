import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Create a room
  socket.emit('create_room', { name: 'TestPlayer', category: 'MUSIC' });
});

socket.on('room_update', (room) => {
  console.log('Room updated:', room.id);
  
  // Start game
  socket.emit('start_game', {
    roomId: room.id,
    playlistId: '76ydlTl00klx55ONdgbCNV',
    userToken: null,
    trackIds: undefined,
    customTracks: undefined
  });
});

socket.on('game_status', (status) => {
  console.log('Game status:', status);
});

socket.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

socket.on('round_start', (data) => {
  console.log('Round started! Tracks:', data.totalTracks);
  process.exit(0);
});
