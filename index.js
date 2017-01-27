let ws = require('nodejs-websocket')
let redis = require('redis')
const _ = require('lodash')

let client = redis.createClient()

let socketPool = []

const joinAction = (conn) => {
  socketPool = _.concat(socketPool, conn)
  console.log('joined')
  console.log(socketPool.length+' active connections')
}

const readState = (callback) => {
  client.get('votes', callback)
}

const mutateState = (reducer) => {
  readState((err, reply) => {
    let newState = reducer(JSON.parse(reply))
    console.log('state mutated')
    client.set('votes', JSON.stringify(newState))
  })
}

const voteAction = (action) => {
  mutateState((votes) => {
    let {uuid, userId, partyId, points} = action
    let newState = [
      ..._.filter(votes, (v) => !(v.userId == action.userId)),
      {uuid, userId, partyId, points}
    ]
    updateClients(newState)
    return newState
  })
}

const leaveParty = (conn, action) => {
  console.log('leaving party')
  console.log(conn.key)
  socketPool = _.filter(socketPool, (c) => c !== conn)
}

const updateClients = (state) => {
  console.log('updating '+socketPool.length+' clients')
  _.each(socketPool, (conn) => {
    conn.send(JSON.stringify(state))
  })
}

let server = ws.createServer(function(conn) {
  console.log('new connection')

  conn.on('text', (str) => {
    let action = JSON.parse(str)
    console.log('incoming action: '+ action.type)
    switch(action.type) {
      case "VOTE":
        voteAction(action)
        break
      case "CREATE_PARTY":
        break
      case "JOIN_PARTY":
        console.log(action)
        joinAction(conn)
        break
      case 'LEAVE_PARTY':
        leaveParty(conn, action)
        break
    }
  })

  conn.on('close', () => console.log('connection closed'))

  conn.on('error', (err) => {})
}).listen(8001)
