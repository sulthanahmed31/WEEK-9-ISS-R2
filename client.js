const io = require("socket.io-client");
const readline = require("readline");
const forge = require("node-forge");

const socket = io("http://localhost:3000");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

let username = "";
let targetUsername = "";
const users = new Map();

// Generate RSA key pair for this client
const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

socket.on("connect", () => {
  console.log("Connected to the server");

  rl.question("Enter your username: ", (input) => {
    username = input;
    console.log(`Welcome, ${username} to the chat`);

    // Register username and public key with the server
    socket.emit("registerPublicKey", {
      username,
      publicKey: publicKeyPem,
    });
    rl.prompt();

    rl.on("line", (message) => {
      if (message.trim()) {
        if ((match = message.match(/^!secret (\w+)$/))) {
          targetUsername = match[1];
          console.log(`Now secretly chatting with ${targetUsername}`);
        } else if (message.match(/^!exit$/)) {
          console.log(`No more secretly chatting with ${targetUsername}`);
          targetUsername = "";
        } else {
          if (targetUsername) {
            const recipientPublicKeyPem = users.get(targetUsername);
            if (!recipientPublicKeyPem) {
              console.log(`No public key found for ${targetUsername}`);
            } else {
              const recipientPublicKey = forge.pki.publicKeyFromPem(recipientPublicKeyPem);
              const encryptedMessage = recipientPublicKey.encrypt(message, "RSA-OAEP");
              socket.emit("message", { username, message: forge.util.encode64(encryptedMessage) });
            }
          } else {
            socket.emit("message", { username, message });
          }
        }
      }
      rl.prompt();
    });
  });
});

socket.on("init", (keys) => {
  keys.forEach(([user, key]) => users.set(user, key));
  console.log(`\nThere are currently ${users.size} users in the chat`);
  rl.prompt();
});

socket.on("newUser", (data) => {
  const { username, publicKey } = data;
  users.set(username, publicKey);
  console.log(`${username} joined the chat`);
  rl.prompt();
});

socket.on("message", (data) => {
  const { username: senderUsername, message: senderMessage } = data;
  if (senderUsername !== username) {
    try {
      const decryptedMessage = keypair.privateKey.decrypt(
        forge.util.decode64(senderMessage),
        "RSA-OAEP"
      );
      console.log(`${senderUsername}: ${decryptedMessage}`);
    } catch (error) {
      console.log(`${senderUsername}: (encrypted message) ${senderMessage}`);
    }
    rl.prompt();
  }
});

socket.on("disconnect", () => {
  console.log("Server disconnected, Exiting...");
  rl.close();
  process.exit(0);
});

rl.on("SIGINT", () => {
  console.log("\nExiting...");
  socket.disconnect();
  rl.close();
  process.exit(0);
});

socket.on("message", (data) => {
  const { username: senderUsername, message: senderMessage } = data;
  if (senderUsername !== username) {
    try {
      const decryptedMessage = keypair.privateKey.decrypt(
        forge.util.decode64(senderMessage),
        "RSA-OAEP"
      );
      console.log(`${senderUsername}: ${decryptedMessage}`);
    } catch (error) {
      console.log(`${senderUsername}: (encrypted message) ${senderMessage}`);
    }
    rl.prompt();
  }
});

socket.on("disconnect", () => {
  console.log("Server disconnected, Exiting...");
  rl.close();
  process.exit(0);
});

rl.on("SIGINT", () => {
  console.log("\nExiting...");
  socket.disconnect();
  rl.close();
  process.exit(0);
});