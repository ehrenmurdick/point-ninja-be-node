let ws = require('nodejs-websocket')
const _ = require('lodash')

let socketPool = []

const joinParty = (conn, action) => {
  conn.userId = action.userId
  conn.partyId = action.uuid
  socketPool = _.concat(socketPool, conn)
}

const leaveParty = (conn) => {
  socketPool = _.reject(socketPool, (c) => c === conn)
}

const publishAction = (action) => {
  let connections = _.filter(socketPool, (conn) => conn.partyId == action.partyId)
  console.log('bouncing to '+connections.length+' connections')
  _.each(connections, (conn) => {
    conn.send(JSON.stringify(action))
  })
}

let server = ws.createServer((conn) => {
  console.log('new connection')

  conn.on('text', (str) => {
    let action = JSON.parse(str)
    console.log('incoming action: '+ action.type)
    switch(action.type) {
      case "JOIN_PARTY":
        joinParty(conn, action)
        break
      case 'LEAVE_PARTY':
        leaveParty(conn, action)
        break
    }
    publishAction(action)
  })

  conn.on('close', () => leaveParty(conn))

  conn.on('error', (err) => {})
}).listen(8001)
