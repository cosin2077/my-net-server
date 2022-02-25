const net = require('net');
let PORT = 3000;
function createWebServer(requestHandler) {
  const server = net.createServer()
  server.on('connection', handleConnection)

  function handleConnection (socket) {
    socket.once('readable', function() {
      let reqBuffer = Buffer.from('')
      let buf
      let reqHeader
      while(true) {
        buf = socket.read()
        if (buf === null) break
        reqBuffer = Buffer.concat([reqBuffer, buf])
        let marker = reqBuffer.indexOf('\r\n\r\n')
        if (marker !== -1) {
          let remaining = reqBuffer.slice(marker + 4)
          reqHeader = reqBuffer.slice(0, marker).toString()
          // console.log('reqHeader.toString', reqHeader)
          socket.unshift(remaining)
          break
        }
      }
      console.log('reqHeader.length:', reqHeader.length)
      const reqHeaders = reqHeader.split('\r\n')
      const reqLine = reqHeaders.shift().split(' ')
      const headers = reqHeaders.reduce((acc, currentHeader) => {
        const [key, value] = currentHeader.split(':');
        return {
          ...acc,
          [key.trim().toLowerCase()]: value.trim()
        }
      }, {})
      const request = {
        method: reqLine[0],
        url: reqLine[1],
        httpVersion: reqLine[2].split('/')[1],
        headers,
        socket
      }
      let status = 200, statusText = 'OK', headersSent = false, isChunked = false
      const responseHeaders = {
        'powered-engine': 'super-code-8'
      }
      function setHeader(key, value) {
        responseHeaders[key.toLowerCase()] = value
      }
      function sendHeaders () {
        if (!headersSent) {
          headersSent = true
          setHeader('date', new Date().toGMTString())
          socket.write(`HTTP/1.1 ${status} ${statusText}\r\n`)
          Object.keys(responseHeaders).forEach(headerKey => {
            socket.write(`${headerKey}: ${responseHeaders[headerKey]}\r\n`)
          })
          socket.write('\r\n')
        }
      }
      const response = {
        write(chunk) {
          if (!headersSent) {
            if (!responseHeaders['content-length']) {
              isChunked = true
              setHeader('transfer-encoding', 'chunked')
            }
            sendHeaders();
          }
          if (isChunked) {
            const size = chunk.length.toString(16)
            socket.write(`${size}\r\n`)
            socket.write(chunk)
            socket.write(`\r\n`)
          } else {
            socket.write(chunk)
          }
        },
        end(chunk) {
          if (!headersSent) {
            if (!responseHeaders['content-length']) {
              // Assume that chunk is a buffer, not a string!
              setHeader('content-length', chunk ? chunk.length : 0);
            }
            sendHeaders();
          }
          if (isChunked) {
            if (chunk) {
              const size = (chunk.length).toString(16);
              socket.write(`${size}\r\n`);
              socket.write(chunk);
              socket.write('\r\n');
            }
            socket.end('0\r\n\r\n');
          } else {
            socket.end(chunk)
          }
        },
        setHeader,
        setStatus (newStatus, newStatusText) {
          status = newStatus
          statusText = newStatusText
        },
        json(data) {
          if (headersSent) {
            throw new Error('Headers sent, cannot proceed to send JSON');
          }
          const json = Buffer.from(JSON.stringify(data));
          setHeader('content-type', 'application/json; charset=utf-8');
          setHeader('content-length', json.length);
          sendHeaders();
          socket.end(json);
        }
      }
      requestHandler(request, response)
    })
  }
  return {
    listen: (port, callback) => server.listen(port, callback)
  }
}

function listen() {
  const webServer = createWebServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    res.setHeader('Content-Type','text/html');
    res.end(`<pre>${JSON.stringify(req.headers, null, 2)}</pre>`);
  })
  const server = webServer.listen(PORT)

    server.on('listening', () => {
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

process.on('uncaughtException', function(err) {
  console.error(err);
  process.exit(1)
});