# CS:GO Player Statistics and Ban Information

An application that gathers player statistics and ban information from Counter-Strike Global Offensive using the Steam API.

Note that this is not a module for the Steam API, it is a web application factored as a module.

Developed in Node.js

## Installation

Clone the repo and do:
```
npm install [path]/csgo-player-stats
```
## Usage
Instantiate
```js
var cs = require('csgo-player-stats');
```

Then run setup with your API key. Set logInput to true if you want to log each input.

```js
cs.setup({
  API : API-Key
  logInput : false
});
```
The player and ban information are fetched with the processSteamIds function. Use the callback function to recieve them.

Example:
```js
cs.processSteamIds(variableWithSteamContents, function(playerStats, banStats) {
      res.render('csresults', { playerStats: playerStats, banStats: banStats });
    });
```