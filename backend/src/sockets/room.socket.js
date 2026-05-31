import ACTIONS from "./Actions.js";
import rooms from "./roomState.js";

const userSocketMap = {}; //this need to be stored in in-memory db , here it is stored in memory

const registerRoomHandlers = (io, socket) => {
  const getAllConnectionDetails = (roomId) => {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
      (socketId) => {
        return {
          socketId,
          username: userSocketMap[socketId],
        };
      },
    );
  };

  //JOIN SOCKET
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectionDetails(roomId);
    // console.log(clients);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  //CODE CHANGE
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code }); //socket.in send the changes to all in room other than the one whose making change
  });

  //CODE SYNC FOR NEW_JOINERS
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  //LANGUAGE CHANGE
  socket.on("language-change", ({ roomId, language }) => {
    socket.in(roomId).emit("language-change", { language });
  });

  //LANGUAGE SYNC FOR NEW_JOINERS
  socket.on("sync-language", ({ socketId, language }) => {
    io.to(socketId).emit("language-change", { language });
  });

  //CODE EXECUTION START
  socket.on("code-running", ({ roomId, username }) => {
    socket.in(roomId).emit("code-running", { username });
  });

  //CODE EXECUTION END
  socket.on("code-idle", ({ roomId }) => {
    socket.in(roomId).emit("code-idle");
  });

  socket.on(ACTIONS.LEAVE, ({ roomId }) => {
    socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
      socketId: socket.id,
      username: userSocketMap[socket.id],
    });
    socket.leave(roomId);
  });

  socket.on(ACTIONS.ASSIGNMENT_COMPLETED, ({ roomId, assignmentId }) => {
    socket.in(roomId).emit(ACTIONS.ASSIGNMENT_COMPLETED, {
      roomId,
      assignmentId,
    });
  });

  // WEBRTC SIGNALING - OFFER
  socket.on("webrtc-offer", ({ roomId, offer, targetSocketId }) => {
    io.to(targetSocketId).emit("webrtc-offer", {
      offer,
      fromSocketId: socket.id,
      fromUsername: userSocketMap[socket.id],
    });
  });

  // WEBRTC SIGNALING - ANSWER
  socket.on("webrtc-answer", ({ answer, targetSocketId }) => {
    io.to(targetSocketId).emit("webrtc-answer", {
      answer,
      fromSocketId: socket.id,
    });
  });

  // WEBRTC SIGNALING - ICE CANDIDATE
  socket.on("ice-candidate", ({ candidate, targetSocketId }) => {
    io.to(targetSocketId).emit("ice-candidate", {
      candidate,
      fromSocketId: socket.id,
    });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });

    delete userSocketMap[socket.id];
    socket.leave();
  });
};

export default registerRoomHandlers;
