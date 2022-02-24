const net = require('net');
let PORT = 3000;

function listen() {
  const server = net.createServer();
  server.on('connection', handleConnection);
  server.listen(PORT)
    .on('listening', () => {
      console.log(`server runnint at: http://localhost:${PORT}`)
    })
    .on('error', (err => {
      if (err && err.code === 'EADDRINUSE') {
        console.log(`PORT: ${PORT} is in use, try another...`)
        PORT++;
        setTimeout(() => {
          server.close();
          listen();
        }, 500);
      }
    }))
}

listen()

function handleConnection(socket) {
  // Subscribe to the readable event once so we can start calling .read()
  socket.once('readable', function () {
    // Set up a buffer to hold the incoming data
    let reqBuffer = Buffer.from('');
    // Set up a temporary buffer to read in chunks
    let buf;
    let reqHeader;
    while (true) {
      // Read data from the socket
      buf = socket.read();
      // Stop if there's no more data
      if (buf === null) break;

      // Concatenate existing request buffer with new data
      reqBuffer = Buffer.concat([reqBuffer, buf]);

      // Check if we've reached \r\n\r\n, indicating end of header
      let marker = reqBuffer.indexOf('\r\n\r\n')
      if (marker !== -1) {
        // If we reached \r\n\r\n, there could be data after it. Take note.
        let remaining = reqBuffer.slice(marker + 4);
        // The header is everything we read, up to and not including \r\n\r\n
        reqHeader = reqBuffer.slice(0, marker).toString();
        // This pushes the extra data we read back to the socket's readable stream
        socket.unshift(remaining);
        break;
      }
    }
    console.log(`Request header:\n${reqHeader}`);

    // At this point, we've stopped reading from the socket and have the header as a string
    // If we wanted to read the whole request body, we would do this:

    reqBuffer = Buffer.from('');
    while ((buf = socket.read()) !== null) {
      reqBuffer = Buffer.concat([reqBuffer, buf]);
    }
    let reqBody = reqBuffer.toString();
    console.log(`Request body:\n${reqBody}`);

    // Send a generic response
    socket.end(`HTTP/1.1 200 OK\r\nServer: my-ecpi-shit-server\r\nContent-Length:${reqHeader.length+('timestamp:'+Date.now()).length + 5}\r\ntimestamp:${Date.now()}\r\n\r\n${reqHeader}\r\n${'timestamp:'+Date.now()}\r\n\r\n`);
  });
}