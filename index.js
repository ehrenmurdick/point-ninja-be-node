let ws = require('nodejs-websocket')
let redis = require('redis')
const _ = require('lodash')

let client = redis.createClient()

let socketPool = {}

const joinAction = (conn, action) => {
  if (_.isNil(socketPool[action.uuid])) {
    socketPool[action.uuid] = []
  }
  socketPool[action.uuid] = _.concat(socketPool[action.uuid], conn)
  console.log(conn.key+' joined '+action.uuid)
  console.log(socketPool.length+' active connections')
}

const readState = (partyId, callback) => {
  client.get(partyId, callback)
}

const mutateState = (partyId, reducer) => {
  readState(partyId, (err, reply) => {
    let newState = reducer(JSON.parse(reply))
    console.log('state mutated')
    client.set(partyId, JSON.stringify(newState))
  })
}

const voteAction = (action) => {
  mutateState(action.partyId, (votes) => {
    let {uuid, userId, partyId, points} = action
    let newState = [
      ..._.filter(votes, (v) => !(v.userId == action.userId)),
      {uuid, userId, partyId, points}
    ]
    updateClients(partyId, newState)
    return newState
  })
}

const leaveParty = (conn, action) => {
  console.log('leaving party')
  console.log(conn.key)
  socketPool[action.uuid] = _.filter(socketPool[action.uuid], (c) => c !== conn)
}

const updateClients = (partyId, state) => {
  _.each(socketPool[partyId], (conn) => {
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
        joinAction(conn, action)
        break
      case 'LEAVE_PARTY':
        leaveParty(conn, action)
        break
    }
  })

  conn.on('close', () => console.log('connection closed'))

  conn.on('error', (err) => {})
}).listen(8001)
