var APIKEY = process.env.SECRETAPI;

var assert = require('assert');
var cs = require('..');

describe('processSteamIds function tests', function() {
  describe('no setup tests', function() {
    it('should return empty lists on empty API config', function(done) {
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

    it('should return empty lists on invalid input', function(done) {
      cs.processSteamIds("", function(playerStats, banStats) {
        assert.deepEqual([], playerStats);
        assert.deepEqual([], banStats);
        done();
      });
    });

    it('should return non-empty lists on valid input', function(done) {
      cs.processSteamIds('# 1 1 "ExamplePlayer" STEAM_1:1:19846328 00:00 00 0 active 80000', function(playerStats, banStats) {
        assert.notDeepEqual([], playerStats);
        assert.notDeepEqual([], banStats);
        done();
      });
    });
  })
});
