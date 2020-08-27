// HTML elements
let clientId = null;
let gameId = null;
let playerColor = null;
let ws = new WebSocket('ws://localhost:9090');
const btnCreate = document.getElementById('btnCreate');
const btnJoin = document.getElementById('btnJoin');
const txtGameId = document.getElementById('txtGameId');
const divPlayers = document.getElementById('divPlayers');
const divBoard = document.getElementById('divBoard');

// wiring events
btnJoin.addEventListener('click', e => {

    if (gameId == null) {
        gameId  = txtGameId.value
    }
    
    const payLoad = {
        'method': 'join',
        'clientId': clientId,
        'gameId': gameId
    }

    ws.send(JSON.stringify(payLoad));           
})

btnCreate.addEventListener('click', e => {

    const payLoad = {
        'method': 'create',
        'clientId': clientId
    }

    ws.send(JSON.stringify(payLoad));
    
})
// when the surver sends the client a message
ws.onmessage = message => {
    // string server sends: message.data
    const response = JSON.parse(message.data);

    // Connect Method: save clientId in global name space
    if (response.method === 'connect') {
        clientId = response.clientId;
        console.log('Client ID set successfully: ' + clientId);
    }

    // create
    if (response.method === 'create') {
        gameId = response.game.id;
        console.log('Game successfully created with ID ' + response.game.id + ' with ' + response.game.ball);
    }

    // join
    if (response.method === 'join') {
        const game = response.game;

        while(divPlayers.firstChild) {
            divPlayers.removeChild(divPlayers.firstChild);
        }

        game.clients.forEach(c => {
            const d = document.createElement('div');
            d.style.width = '200px';
            d.style.background = c.color;
            d.textContent = c.clientId;
            divPlayers.appendChild(d);

            if (c.clientId === clientId) playerColor = c.color;
        });

        while(divBoard.firstChild) {
            divBoard.removeChild(divBoard.firstChild);
        }
    }
}