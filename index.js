let ws = require('nodejs-websocket')
let redis = require('redis')
const _ = require('lodash')

let client = redis.createClient()

const mutateState = (reducer) => {
  client.get('votes', (err, reply) => {
    let newState = reducer(JSON.parse(reply))
    console.log(newState)
    client.set('votes', JSON.stringify(newState))
  })
}

const voteAction = () => {
  mutateState((votes) => {
    let {uuid, userId, partyId, points} = action
    return [
      ..._.filter(votes, (v) => !(v.userId == action.userId)),
      {uuid, userId, partyId, points}
    ]
  })
}

let server = ws.createServer(function(conn) {
  console.log('new connection')

  conn.on('text', (str) => {
    let action = JSON.parse(str)
    switch(action.type) {
      case "VOTE":
        voteAction(action)
    }
  })

  conn.on('close', () => console.log('connection closed'))

  conn.on('error', (err) => {})
}).listen(8001)
