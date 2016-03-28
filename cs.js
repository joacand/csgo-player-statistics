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

var API;
var logInput = false;

exports.setup = function(options) {
  API = options.API;
  logInput = options.logInput;
}

exports.processSteamIds = function(steamContents, callback) {
  if (!validInput(steamContents)) {
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

  getInformationFromAPI(steamIDs, function(ps, bs) {
    processData(ps, bs, callback);
  });
}

function validInput(input) {
  if (API === "") {
    console.log("Error: API key is not set up");
    return false;
  }
  if (input.length < 20)
    return false;
  return true;
}

function processData(ps, bs, callback) {
  var playerStats = getPlayerStats(ps);
  var banStats = getBanStats(bs, ps);

  callback(playerStats, banStats);
}

function getPlayerStats(ps) {
  var players=[];

  for (var i = 0; i < ps.length; i++) {
    pl = ps[i];
    pFriends = getFriends(pl.getFriendResults(), ps, pl.getNick());
    premadeSize = pFriends.length+1;
    stats = getStats(pl.getGameResults());

    var player = {
      nick : pl.getNick(),
      timePlayed : stats[0],
      kdRatio : stats[1],
      accuracy : stats[2],
      friendsWith : genFriendOutput(pFriends),
      premadeSize : premadeSize
    }

    players.push(player);
  }
  players.sort(sortPlayerStats);

  return players;
}

function getFriends(fList, ps, me) {
  if (fList === undefined)
    return [];
  res=[];
  for (var i = 0; i < ps.length; i++) {
    p=ps[i];
    if ((fList.indexOf((""+p.getCommunityid())) !== -1) && p.getNick() !== me) {
      res.push(p.getNick());
    }
  }

  return res;
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

function getBanStats(bs, ps) {
  var playersBanStats = [];
  var banListPlayers = $.parseJSON(bs).players;

  for (var i = 0; i < banListPlayers.length; i++) {
    pb = banListPlayers[i];

    var playerBanInfo = {
      communityId : communityIdToNick(ps, pb.SteamId),
      isCommunityBanned : "",
      isVACBanned : "",
      numberOfVACBans : pb.NumberOfVACBans,
      daysSinceLastBan : pb.DaysSinceLastBan,
      numberOfGameBans : pb.NumberOfGameBans
    }

    if (pb.CommunityBanned === false)
      playerBanInfo.isCommunityBanned = "<FONT COLOR=\"GREEN\"><b>No</b></FONT>";
    else
      playerBanInfo.isCommunityBanned = "<FONT COLOR=\"RED\"><b>Yes</b></FONT>";

    if (pb.VACBanned === false) 
      playerBanInfo.isVACBanned = "<FONT COLOR=\"GREEN\"><b>No</b></FONT>";
    else
      playerBanInfo.isVACBanned = "<FONT COLOR=\"RED\"><b>Yes</b></FONT>";

    playersBanStats.push(playerBanInfo);
  }
  playersBanStats.sort(sortBanStats);

  return playersBanStats;
}

function sortBanStats(a, b) {
  aComp = a.communityId.toLowerCase();
  bComp = b.communityId.toLowerCase();
  if (aComp === bComp) 
    return 0;
  return (aComp < bComp) ? -1 : 1;
}

function sortPlayerStats(a, b) {
  aComp = a.nick.toLowerCase();
  bComp = b.nick.toLowerCase();
  if (aComp === bComp) 
    return 0;
  return (aComp < bComp) ? -1 : 1;
}

function communityIdToNick(ps, cid) {
  for (var i = 0; i < ps.length; i++) {
    p = ps[i];
    if ((""+p.getCommunityid()) === cid) {
      return p.getNick();
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

function getInformationFromAPI(sIds, callback) {
  var allPlayersInfo = sIds.split("\n");

  var URLResults = collectURLs(allPlayersInfo);

  var players = URLResults.players;
  var nodesFriends = URLResults.nodesFriends;
  var nodesGameStats = URLResults.nodesGameStats;

  // Request all the URLs 
  var URLRequests = nodesFriends.concat(nodesGameStats);
  __request(URLRequests, function(responses) {
    for (var i = 0; i < nodesFriends.length-1; i++) {
      var resp = responses[nodesFriends[i]].body;
      players[i].setFriendResults(resp);
    }

    for (var i = 0; i < nodesGameStats.length; i++) {
      var resp = responses[nodesGameStats[i]].body;
      players[i].setGameResults(resp);
    }

    var banResults = responses[nodesFriends[nodesFriends.length-1]].body;

    callback(players, banResults);
  });
}

function collectURLs(allPlayersInfo) {
  var players = [], nodesFriends = [], nodesGameStats = [], nodesBanStats = [], banIDs = "";

  for (var i = 0; i < allPlayersInfo.length; i++) {
    playerInfo = allPlayersInfo[i].replace("  ", " ").replace("   ", " ");

    if (validPlayerInfo(playerInfo)) {
      infoArray = splitInfoToArr(playerInfo);

      var p = new Player(infoArray[3], infoArray[4], toCommunityId(infoArray[4]));

      players.push(p);
      nodesFriends.push('http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key='+API+'&steamid='+p.getCommunityid()+'&relationship=friend');
      nodesGameStats.push('http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&key='+API+'&steamid='+p.getCommunityid());
      banIDs += (","+p.getCommunityid());
    }
  }
  nodesFriends.push('http://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key='+API+'&steamids='+banIDs);

  return {
    players: players,
    nodesFriends : nodesFriends,
    nodesGameStats : nodesGameStats
  }
}

function validPlayerInfo(pInfo) {
  return pInfo.charAt(0) === '#' && pInfo.charAt(1) === " " &&  
      (isNum(pInfo.charAt(2)) || isNum(pInfo.charAt(3)));
}

function splitInfoToArr(info) {
  arr = [].concat.apply([], info.split('"').map(function(v,i){
         return i%2 ? v : v.split(' ')
      })).filter(Boolean);
  return arr;
}

// Convert a 32-bit steamID to a 64-bit steamID, using the mathjs library
function toCommunityId(steamid) {
  var parts = steamid.split(":");
  return math.eval("("+parts[2]+"*2)+76561197960265728+"+parts[1]);
}

// "Class" representing a player
function Player (nick, steamid, communityid) {
  this.nick=nick;
  this.steamid=steamid;
  this.communityid=communityid;
  this.friendResults;
  this.gameResults;
  this.getNick = function() {
    return this.nick;
  };
  this.getSteamid = function() {
    return this.steamid;
  };
  this.getCommunityid = function() {
    return this.communityid;
  };
  this.setFriendResults = function(res) {
    this.friendResults=res;
  };
  this.setGameResults = function(res) {
    this.gameResults=res;
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
