module sorcerio.gameServer.server;

import sorcerio;
import vibe.vibe : WebSocket;
import std.json;

class Server {

	static private ushort currentPlayerId = 0;
	/++
	+ Generates a unique id for a child Player. It needs to be passed the current child Players so it can re-use ids.
	+/
	static ushort generatePlayerId(Player[ushort] players) {
		if (currentPlayerId == currentPlayerId.max) {
			foreach (ushort i; 0 .. currentPlayerId.max) {//find an unused id
				if ((i in players) is null) {
					return i;
				}
			}
		} else {
			return currentPlayerId++;
		}
		
		assert(0);//this should never be reached
	}


	immutable ushort id;
	private Player[ushort] players;
	int mapSize;
	private long lastUpdate;

	void resizeMap() {
		import std.math;
		int newMapSize = cast(int) round( ((this.players.length + 2)^^2)^^(1.0 / 2.5) * 1000 );
		
		if (newMapSize < CONFIG.minMapSize) {
			newMapSize = CONFIG.minMapSize;
		} else if (newMapSize > CONFIG.maxMapSize) {
			newMapSize = CONFIG.maxMapSize;
		}

		this.mapSize = newMapSize;
	}

	private JSONValue getState() {
		JSONValue state = JSONValue();

		JSONValue[] playerJSON;


		foreach (player; players) {
			playerJSON ~= player.JSONof();
		}

		state["players"] = playerJSON;

		return state;
	}

	private void sendUpdateToClients() {
		JSONValue state = getState();
		state["type"] = "update";
		string stateString = state.toString();

		foreach(player; players) {
			player.socket.send(stateString);
		}
		this.lastUpdate = millis();
	}

	void tick() {
		if (millis() - lastUpdate >= CONFIG.updateInterval) {
			sendUpdateToClients();
		}
	}

	ushort addPlayer(PlayerConfig cfg) {
		immutable ushort playerId = Server.generatePlayerId(players);

		Player newPlayer = new Player(cfg.nickname, cfg.socket, randomPoint(mapSize, mapSize), playerId);
		players[playerId] = newPlayer;

		resizeMap();
		return playerId;
	}

	bool isFull() {
		if (players.length == CONFIG.maxPlayers) {
			return true;
		} else {
			return false;
		}
	}

	this(ushort id) {
		this.id = id;
		this.mapSize = CONFIG.minMapSize;
		this.lastUpdate = 0;
	}
}
