
var express = require('express');
var cs = require('csgo-player-stats');

app = express();
app.set('view engine', 'jade');

var bodyParser = require('body-parser')
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

var http = require('http');
const PORT=3000;

cs.setup({
  API : "YourAPIKeyHere",
  logInput : true
});

app.use(express.static('public'));

app.get('/', function(req, res) {
  res.render('cs', { title: 'Counter Strike: Global Offensive Friend and Ban Checker'});
});

// Post method
app.post('/', function(req, res) {
  cs.processSteamIds(req.body.steamid, function(playerStats, banStats) {
    res.render('csresults', { playerStats : playerStats, banStats : banStats });
  });
});

var server = http.createServer(app);

server.listen(PORT, "0.0.0.0");
console.log("Server listening on: http://0.0.0.0:%s", PORT);
