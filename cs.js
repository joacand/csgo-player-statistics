var fs = require('fs');
var math = require('mathjs');
var request = require('request');

var jsdom = require('jsdom').jsdom;
var document = jsdom('<html></html>', {});
var window = document.defaultView;
var $ = require('jquery')(window);

math.config({
  number: 'BigNumber',
  precision: 20
});

var API = "";
var logInput = false;

exports.setup = setup;
exports.processSteamIds = processSteamIds;

function setup(options) {
  API = options.API;
  logInput = options.logInput;
}

function processSteamIds(steamContents, callback) {
  if (!isValidInput(steamContents)) {
    callback([],[]);
    return;
  }

  var steamID, friends, playerInfo, friendGroups;

  steamIDs = steamContents.trim().replace(/\\(.)/mg, "$1");

  if (logInput) {
    fs.appendFile('./csgo-player-stats-inputs.txt', steamIDs, function (err) {
      if (err)
        console.log("Error when writing to file - " + err);
    });
  }

  getInformationFromAPI(steamIDs, function(players, banData) {
    processData(players, banData, callback);
  });
}

function isValidInput(input) {
  if (API === "") {
    console.log("Error: API key is not set up");
    return false;
  }
  if (input.length < 20)
    return false;
  return true;
}

function processData(players, banData, callback) {
  var playerStats = getPlayerStats(players);
  var banStats = getBanStats(banData, players);

  callback(playerStats, banStats);
}

function getPlayerStats(players) {
  var playerStats = [];

  for (var i = 0; i < players.length; i++) {
    var player = players[i];
    var pFriends = getFriends(player, players);
    var premadeSize = pFriends.length+1;
    var stats = getStats(player.getGameResults());

    var playerData = {
      nick : player.getNick(),
      timePlayed : stats[0],
      kdRatio : stats[1],
      accuracy : stats[2],
      friendsWith : genFriendOutput(pFriends),
      premadeSize : premadeSize
    };

    playerStats.push(playerData);
  }
  playerStats.sort(sortFunction);

  return playerStats;
}

function getFriends(player, players) {
  var friendList = player.getFriendResults();
  var nick = player.getNick();
  var result = [];

  if (friendList === undefined)
    return result;

  for (var i = 0; i < players.length; i++) {
    var otherPlayer = players[i];
    if ((friendList.indexOf((""+otherPlayer.getCommunityid())) !== -1) && otherPlayer.getNick() !== nick) {
      result.push(otherPlayer.getNick());
    }
  }

  return result;
}

function getStats(playerStats) {
  results=[];

  if (playerStats.length < 500) {
    results.push("<font color =\"#FF9900\"><b>Private</b></font>");
    results.push("<font color =\"#FF9900\"><b>Private</b></font>");
    results.push("<font color =\"#FF9900\"><b>Private</b></font>");
    return results;
  } 

  var obj = $.parseJSON(playerStats);
  var statList = obj.playerstats.stats;
  var gameTimeM, totKills, totDeaths, shotsAK, hitsAK, shotsM4, hitsM4;

  for (var i = 0; i < statList.length; i++) {
    var stat = statList[i];
    switch(stat.name) {
      case "total_time_played":
        gameTimeM = stat.value;
        break;
      case "total_kills":
        totKills = stat.value;
        break;
      case "total_deaths":
        totDeaths = stat.value;
        break;
      case "total_shots_ak47":
        shotsAK = stat.value;
        break;
      case "total_hits_ak47":
        hitsAK = stat.value;
        break;
      case "total_shots_m4a1":
        shotsM4 = stat.value;
        break;
      case "total_hits_m4a1":
        hitsM4 = stat.value;
        break;
    }
  }

  gameTime = Math.floor(gameTimeM/(60*60));
  KDRatio = Math.round((totKills/totDeaths)*100)/100;
  AccAk = Math.round((hitsAK/shotsAK)*100)/100;
  AccM4 = Math.round((hitsM4/shotsM4)*100)/100;
  Acc = Math.round(((AccAk+AccM4)/2)*100);

  results.push(colorTime(gameTime));
  results.push(colorKD(KDRatio));
  results.push(colorAcc(Acc));

  return results; 
}

function genFriendOutput(pF) {
  var output = "";
  for (var i = 0; i < pF.length; i++) {
    output += pF[i]+", ";
  }
  return output.slice(0, -2);
}

function getBanStats(banData, players) {
  var playersBanStats = [];
  var banListPlayers = $.parseJSON(banData).players;

  for (var i = 0; i < banListPlayers.length; i++) {
    var player = banListPlayers[i];

    var playerBanInfo = {
      nick : communityIdToNick(players, player.SteamId),
      isCommunityBanned : "",
      isVACBanned : "",
      numberOfVACBans : player.NumberOfVACBans,
      daysSinceLastBan : player.DaysSinceLastBan,
      numberOfGameBans : player.NumberOfGameBans
    };

    if (player.CommunityBanned === false)
      playerBanInfo.isCommunityBanned = "<FONT COLOR=\"GREEN\"><b>No</b></FONT>";
    else
      playerBanInfo.isCommunityBanned = "<FONT COLOR=\"RED\"><b>Yes</b></FONT>";

    if (player.VACBanned === false)
      playerBanInfo.isVACBanned = "<FONT COLOR=\"GREEN\"><b>No</b></FONT>";
    else
      playerBanInfo.isVACBanned = "<FONT COLOR=\"RED\"><b>Yes</b></FONT>";

    playersBanStats.push(playerBanInfo);
  }
  playersBanStats.sort(sortFunction);

  return playersBanStats;
}

function sortFunction(a, b) {
  var aComp = a.nick.toLowerCase();
  var bComp = b.nick.toLowerCase();
  if (aComp === bComp) 
    return 0;
  return (aComp < bComp) ? -1 : 1;
}

function communityIdToNick(players, communityId) {
  for (var i = 0; i < players.length; i++) {
    var player = players[i];
    if ((""+player.getCommunityid()) === communityId) {
      return player.getNick();
    }
  }
  return "Unknown";
}

function colorTime(time) {
  if (time < 100) {
    if (time < 50) {
      return "<font color=\"red\"><b>"+time+"</b></font>";
    } else {
      return "<font color=\"brown\"><b>"+time+"</b></font>";
    }
  }
  return time;
}

function colorKD(KD) {
  if (KD > 1.5) {
    if (KD > 2) {
      return "<font color=\"red\"><b>"+KD+"</b></font>";
    } else {
      return "<font color=\"brown\"><b>"+KD+"</b></font>";
    }
  }
  return KD;
}

function colorAcc(acc) {
  if (acc > 20) {
    if (acc > 30) {
      return "<font color=\"red\"><b>"+acc+"%</b></font>";
    } else {
      return "<font color=\"brown\"><b>"+acc+"%</b></font>";
    }
  }
  return acc+"%";
}

function getInformationFromAPI(steamIds, callback) {
  var allPlayersInfo = steamIds.split("\n");

  var URLResults = collectURLs(allPlayersInfo);
  var players = URLResults.players;
  var nodesFriends = URLResults.nodesFriends;
  var nodesGameStats = URLResults.nodesGameStats;

  // Request all the URLs 
  var URLRequests = nodesFriends.concat(nodesGameStats);
  __request(URLRequests, function(responses) {
    var i, response;
    for (i = 0; i < nodesFriends.length-1; i++) {
      response = responses[nodesFriends[i]].body;
      players[i].setFriendResults(response);
    }

    for (i = 0; i < nodesGameStats.length; i++) {
      response = responses[nodesGameStats[i]].body;
      players[i].setGameResults(response);
    }

    var banResults = responses[nodesFriends[nodesFriends.length-1]].body;

    callback(players, banResults);
  });
}

function collectURLs(allPlayersInfo) {
  var players = [], nodesFriends = [], nodesGameStats = [], nodesBanStats = [], banIDs = "";

  for (var i = 0; i < allPlayersInfo.length; i++) {
    var playerInfo = allPlayersInfo[i].replace("  ", " ").replace("   ", " ");

    if (isValidPlayerInfo(playerInfo)) {
      infoArray = splitInfoToArr(playerInfo);

      var player = new Player(infoArray[3], infoArray[4], steamToCommunityId(infoArray[4]));

      players.push(player);
      nodesFriends.push('http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key='+API+'&steamid='+player.getCommunityid()+'&relationship=friend');
      nodesGameStats.push('http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&key='+API+'&steamid='+player.getCommunityid());
      banIDs += (","+player.getCommunityid());
    }
  }
  nodesFriends.push('http://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key='+API+'&steamids='+banIDs);

  return {
    players: players,
    nodesFriends : nodesFriends,
    nodesGameStats : nodesGameStats
  };
}

function isValidPlayerInfo(pInfo) {
  return pInfo.charAt(0) === '#' && pInfo.charAt(1) === " " &&  
      (isNum(pInfo.charAt(2)) || isNum(pInfo.charAt(3)));
}

function splitInfoToArr(info) {
  var arr = [].concat.apply([], info.split('"').map(function(v,i){
         return i%2 ? v : v.split(' ');
      })).filter(Boolean);
  return arr;
}

// Convert a 32-bit steamID to a 64-bit steamID, using the mathjs library
function steamToCommunityId(steamId) {
  var parts = steamId.split(":");
  return math.eval("("+parts[2]+"*2)+76561197960265728+"+parts[1]);
}

// "Class" representing a player
function Player (nick, steamId, communityid) {
  this.nick = nick;
  this.steamId = steamId;
  this.communityid = communityid;
  this.friendResults = "";
  this.gameResults = [];
  this.getNick = function() {
    return this.nick;
  };
  this.getSteamid = function() {
    return this.steamId;
  };
  this.getCommunityid = function() {
    return this.communityid;
  };
  this.setFriendResults = function(res) {
    this.friendResults = res;
  };
  this.setGameResults = function(res) {
    this.gameResults = res;
  };
  this.getFriendResults = function() {
    return this.friendResults;
  };
  this.getGameResults = function() {
    return this.gameResults;
  };
}

function isNum(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Handle multiple requests at once
 * @param urls [array]
 * @param callback [function]
 * @requires request module for node ( https://github.com/mikeal/request )
 *
 * Modified from: https://gist.github.com/natos/2001487
 */
var __request = function (urls, callback) {
  'use strict';
  var results = {}, c = 0;
  var handler = function (error, response, body) {
    var url = response.request.uri.href;
    results[url] = { error: error, response: response, body: body };
    if (++c === urls.length) { 
      callback(results); 
    }
  };

  for (var i = 0; i < urls.length; i++) {
    request(urls[i], handler);
  }
};
