var APIKEY = process.env.SECRETAPI;

var assert = require('assert');
var cs = require('..');

describe('processSteamIds function tests', function() {
  describe('no setup tests', function() {
    it('should return an empty lists on empty API configuration', function(done) {
      cs.processSteamIds('# 1 1 "ExamplePlayer" STEAM_1:1:19846328 00:00 00 0 active 80000', function(playerStats, banStats) {
        assert.deepEqual([], playerStats);
        assert.deepEqual([], banStats);
        done();
      });
    });
  });

  describe('valid setup tests', function() {
    before(function() {
      cs.setup({
        API : APIKEY,
        logInput : false
      });
    });

    it('should return an empty lists on empty input', function(done) {
      testLengthOfOutput("", 0, done);
    });

    it('should return an empty lists on invalid input', function(done) {
      testLengthOfOutput("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis elementum gravida dolor,\n" +
        "a sollicitudin elit molestie eget. Morbi a aliquam est. Duis porta metus nulla, ut luctus nisi imperdiet nec.\n" +
        "Suspendisse euismod eget nibh quis pulvinar. Nunc ullamcorper quis nulla sit amet mollis.\n" +
        "Nam accumsan ultrices commodo. Sed molestie justo.", 0, done);
    });

    it('should return a list of length one for one valid player', function(done) {
      testLengthOfOutput('# 1 1 "ExamplePlayer" STEAM_1:1:19846328 00:00 00 0 active 80000', 1, done);
    });

    it('should return a list of length three for three valid players', function(done) {
      testLengthOfOutput('# 1 1 "ExamplePlayer1" STEAM_1:1:19846328 00:00 00 0 active 80000\n'+
        '# 1 1 "ExamplePlayer2" STEAM_1:1:19846329 00:00 00 0 active 80000\n'+
        '# 1 1 "ExamplePlayer3" STEAM_1:1:19846330 00:00 00 0 active 80000', 3, done);
    });

    function testLengthOfOutput(input, length, done) {
      cs.processSteamIds(input, function(playerStats, banStats) {
        assert.deepEqual(length, playerStats.length);
        assert.deepEqual(length, banStats.length);
        done();
      });
    }

    it('should be able to parse players with quotation marks in their nick', function(done) {
      var nick = 'Example "12" Player'
      testNick(nick, done);
    });

    it('should be able to parse players with single quotation marks in their nick', function(done) {
      var nick = "Example '12' Player"
      testNick(nick, done);
    });

    function testNick(nickToTest, done) {
      cs.processSteamIds("# 1 1 \""+nickToTest+"\" STEAM_1:1:19846330 00:00 00 0 active 80000", function(playerStats, banStats) {
        assert.deepEqual(nickToTest, playerStats[0].nick);
        assert.deepEqual(nickToTest, banStats[0].nick);
        done();
      });
    }
  })
});
