const http = require("http");
const socketIo = require("socket.io");

const server = http.createServer();
const io = socketIo(server);

const users = new Map(); // Store username-to-socket and public key mappings

io.on("connection", (socket) => {
  console.log(`Client ${socket.id} connected`);

  // Handle user registration
  socket.on("registerPublicKey", ({ username, publicKey }) => {
    users.set(username, { socket, publicKey });
    socket.username = username;

    console.log(`${username} registered with a public key.`);
    
    // Notify all users about the new user and send the public key
    socket.broadcast.emit("newUser", { username, publicKey });

    // Send the list of current users to the new user
    socket.emit(
      "init",
      Array.from(users.entries()).map(([user, { publicKey }]) => [user, publicKey])
    );
  });

  // Handle public messages
  socket.on("message", (data) => {
    const { username, message } = data;
    io.emit("message", { username, message }); // Broadcast the message
  });

  // Handle private messages (optional, not required for this task)
  socket.on("privateMessage", ({ sender, recipient, message }) => {
    const recipientData = users.get(recipient);
    if (recipientData) {
      recipientData.socket.emit("privateMessage", { sender, message });
    } else {
      socket.emit("error", `Recipient ${recipient} not found`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    if (socket.username) {
      users.delete(socket.username);
      console.log(`Client ${socket.username} disconnected`);
    }
  });
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
