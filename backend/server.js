import app from "./src/app.js";
import connectDb from "./src/db/db.js";

import { Server } from "socket.io";
import http from "http";

import initializeSockets from "./src/sockets/index.js";

connectDb();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

initializeSockets(io);

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
