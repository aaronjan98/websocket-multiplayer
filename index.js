const http = require('http');
// serve this page on another port with express
const express = require('express');
const app = express();
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.listen(9091, () => console.log('Listening on http port 9091'));

const websocketServer = require('websocket').server;
const httpServer = http.createServer();
httpServer.listen(9090, () => console.log(`listening on 9090`));

// hash map clients
const clients = {};
const games = {};

const wsServer = new websocketServer({
    'httpServer': httpServer
});

wsServer.on('request', request => {
    // connect
    const connection = request.accept(null, request.origin);
    connection.on('open', () => console.log('opened'));
    connection.on('close', () => console.log('closed'));

    connection.on('message', message => {
        // Data that the server receives
        const result = JSON.parse(message.utf8Data);
        // I have received a message from the client
        // User wants to create a new game
        if (result.method === 'create') {
            const clientId = result.clientId;
            const gameId = guid();
            games[gameId] = {
                'id': gameId,
                'ball': 1,
                'clients': []
            }

            const payLoad = {
                'method': 'create',
                'game': games[gameId]
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));
        }

        // a client wants to join
        if (result.method === 'join') {
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];
            if (game.clients.length > 2) {
                // two players max
                return;
            }
            const color = {'0': 'red', '1': 'blue'}[game.clients.length];
            game.clients.push({
                'clientId': clientId,
                'color': color
            });

            const payLoad = {
                'method': 'join',
                'game': game
            };

            // look through all the clients and tell them another player has joined
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad));
            });
        }
    })

    // generate a new clientId
    const clientId = guid();
    clients[clientId] = {
        'connection': connection
    };

    // response to the client connection
    const payLoad = {
        'method': 'connect',
        'clientId': clientId
    };
    // send back the client connect
    connection.send(JSON.stringify(payLoad));
});

function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}

// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();