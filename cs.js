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

exports.processSteamIds = function(steamContents, sentAPI, callback) {
  API=sentAPI;
	var steamID, friends, playerInfo, friendGroups;

  steamIDs = steamContents.trim().replace(/\\(.)/mg, "$1");

  fs.appendFile('./recent.txt', steamIDs, function (err) {
    if (err)
      console.log("Error when writing to file - " + err);
  });

  getInformationFromAPI(steamIDs, function(ps, bs) {
    processData(ps, bs, callback);
  });
}

function processData(ps, bs, callback) {
  var playerStats = getPlayerStats(ps);
  var banStats = getBanStats(bs, ps);

  callback(playerStats, banStats);
}

function getPlayerStats(ps) {
  var playerStats=[];

  for (var i = 0; i < ps.length; i++) {
    playerStats.push([]);

    pl = ps[i];
    pFriends = getFriends(pl.getFriendResults(), ps, pl.getNick());
    premadeSize = pFriends.length+1;
    stats = getStats(pl.getGameResults());

    playerStats[i].push(pl.getNick());
    playerStats[i].push(stats[0]);
    playerStats[i].push(stats[1]);
    playerStats[i].push(stats[2]);
    playerStats[i].push(genFriendOutput(pFriends));
    playerStats[i].push(premadeSize);
  }
  playerStats.sort(sortFunction);

  return playerStats;
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
  var banStats = [];
  var banListPlayers = $.parseJSON(bs).players;

  for (var i = 0; i < banListPlayers.length; i++) {
    pb = banListPlayers[i];
    banStats.push([]);
    banStats[i].push(communityIdToNick(ps, pb.SteamId));

    if (pb.CommunityBanned === false)
      banStats[i].push("<FONT COLOR=\"GREEN\"><b>No</b></FONT>");
    else
      banStats[i].push("<FONT COLOR=\"RED\"><b>Yes</b></FONT>");

    if (pb.VACBanned === false) 
      banStats[i].push("<FONT COLOR=\"GREEN\"><b>No</b></FONT>");
    else
      banStats[i].push("<FONT COLOR=\"RED\"><b>Yes</b></FONT>");

    banStats[i].push(pb.NumberOfVACBans);
    banStats[i].push(pb.DaysSinceLastBan);
    banStats[i].push(pb.NumberOfGameBans); 
  }
  banStats.sort(sortFunction);

  return banStats;
}

function sortFunction(a, b) {
  aComp = a[0].toLowerCase();
  bComp = b[0].toLowerCase();
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
  var rows = sIds.split("\n");
  var players = [];
  var nodesFriends = [];
  var nodesGameStats = [];
  var nodesBanStats = [];

  // Collect all the URLs
  for (var i = 0; i < rows.length; i++) {
    steamId = rows[i];
    steamId = steamId.replace("  ", " ");
    steamId = steamId.replace("   ", " ");

    // Check if the SteamId is valid
    if (steamId.charAt(0) === '#' && steamId.charAt(1) === " " &&  
      (isNum(steamId.charAt(2)) || isNum(steamId.charAt(3)))) {

      nick = [].concat.apply([], steamId.split('"').map(function(v,i){
         return i%2 ? v : v.split(' ')
      })).filter(Boolean);

      var p = new Player(nick[3], nick[4], toCommunityId(nick[4]));

      players.push(p);
      nodesFriends.push('http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key='+API+'&steamid='+p.getCommunityid()+'&relationship=friend');
      nodesGameStats.push('http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&key='+API+'&steamid='+p.getCommunityid());
      nodesBanStats.push(""+p.getCommunityid());
    }
  }

  var sIds = "";
  for (var i = 0; i < nodesBanStats.length; i++) {
    sIds += (","+nodesBanStats[i]);
  }

  // Borrow the friendNodes list to push banlist
  nodesFriends.push('http://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key='+API+'&steamids='+sIds);

  // Request all URLs 
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
 * From: https://gist.github.com/natos
 * Source: https://gist.github.com/natos/2001487
 */
var __request = function (urls, callback) {
  'use strict';
  var results = {}, t = urls.length, c = 0,
    handler = function (error, response, body) {
      var url = response.request.uri.href;
      results[url] = { error: error, response: response, body: body };
      if (++c === urls.length) { callback(results); }
    };
  while (t--) { request(urls[t], handler); }
};