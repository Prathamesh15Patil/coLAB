import registerRoomHandlers from "./room.socket.js";

const initializeSockets = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    registerRoomHandlers(io, socket);
  });
};

export default initializeSockets;
