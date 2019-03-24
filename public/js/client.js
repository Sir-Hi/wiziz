//(function() {
'use strict';

////////////////
////@MODULES////
////////////////

/*

{module}.init() should be completely independent from all other modules. It should initialize everything in the module.
{module}.setup() can use other modules

sorcerio - global module, contains all submodules
	renderer - stuff for rendering the game (only the <canvas>s)
	ui - game ui HTML elements
	media - sounds, images, etc
	comm - server communication
	events - events + game status
	meta - constants that are determined in the server code
	game - game state
	input - input stuff

*/

const sorcerio = {
	renderer: {},
	ui: {},
	media: {},
	comm: {},
	events: {},
	meta: {},
	game: {},
	input: {}
};

sorcerio.init = function() {//called once, on page load
	document.querySelector("#loading").style.display = "none";
	document.querySelector("#instructionsToggle").checked = true;

	const subModules = [
		sorcerio.renderer,
		sorcerio.ui,
		sorcerio.media,
		sorcerio.comm,
		sorcerio.events,
		sorcerio.meta,
		sorcerio.game,
		sorcerio.input
	];

	for (let i = 0; i < subModules.length; i++) {
		if (subModules[i].create !== undefined) {console.log("YOU USED create() INSTEAD OF setup()!!!!!!");}//TODO: remove this. it is just here so that I dont keep accidentally making create() methods instead of setup().
		if (subModules[i].init !== undefined) {
			subModules[i].init();
		}
	}

	for (let i = 0; i < subModules.length; i++) {
		if (subModules[i].setup !== undefined) {
			subModules[i].setup();
		}
	}
}.bind(sorcerio);


sorcerio.mainLoop = function() {
	const currentTime = performance.now();

	sorcerio.renderer.render();

	if (currentTime - sorcerio.input.lastInputSendTime >= sorcerio.input.inputSendInterval) {
		sorcerio.comm.ws.send(sorcerio.input.getInput());
		sorcerio.input.lastInputSendTime = currentTime;
	}

	if (sorcerio.events.isPlaying) {
		window.requestAnimationFrame(sorcerio.mainLoop);
	}
};


/////////////
//@RENDERER//
/////////////


sorcerio.renderer.init = function() {
	this.grid = {
		xOffset: 0,
		yOffset: 0,
		gridSize: 40,
		lineWidth: 1,
		backgroundColor: '#E8E8F9',
		lineColor: '#bebebe',
		borderColor: '#d4342a'
	};
}.bind(sorcerio.renderer);

sorcerio.renderer.setup = function() {
	this.gridCtx = sorcerio.ui.gridCanvas.getContext("2d");
	this.gameCtx = sorcerio.ui.gameCanvas.getContext("2d");
}.bind(sorcerio.renderer);

sorcerio.renderer.render = function() {
	this.renderGrid();

	this.gameCtx.clearRect(0, 0, sorcerio.ui.gameCanvas.width, sorcerio.ui.gameCanvas.height);

	for (let i = 0; i < sorcerio.game.latestAuthoritativeGameState.players.length; i++) {
		let player = sorcerio.game.latestAuthoritativeGameState.players[i];

		if (player.id === sorcerio.game.myPlayerId) {
			continue;
		}

		this.renderPlayer(player);
	}

	this.renderSelf();
}.bind(sorcerio.renderer);

sorcerio.renderer.renderPlayer = function(player) {
	this.gameCtx.save();
	this.gameCtx.translate(sorcerio.game.localCoords(player.location.x, 'x'), sorcerio.game.localCoords(player.location.y, 'y'));
	this.gameCtx.rotate(sorcerio.game.calculatePlayerAngle(player));
	this.gameCtx.drawImage(sorcerio.media.sprites.playerRed, -sorcerio.media.sprites.playerRed.width / 2, -sorcerio.media.sprites.playerRed.height / 2);
	this.gameCtx.restore();
	this.gameCtx.save();
	this.gameCtx.translate(sorcerio.game.localCoords(player.location.x, 'x'), sorcerio.game.localCoords(player.location.y, 'y'));
	this.gameCtx.font = "20px newRocker";
	this.gameCtx.fillStyle = '#2dafaf';
	this.gameCtx.fillText(player.nickname, -(this.gameCtx.measureText(player.nickname).width / 2), 80);
	this.gameCtx.font = "18px agane";
	this.gameCtx.fillStyle = '#2dafaf';
	this.gameCtx.fillText('lvl ' + player.level, -(this.gameCtx.measureText('lvl ' + player.level).width / 2), 100);
	this.gameCtx.restore();
}.bind(sorcerio.renderer);

sorcerio.renderer.renderSelf = function() {
	this.gameCtx.save();
	this.gameCtx.translate(sorcerio.ui.gameCanvas.width / 2, sorcerio.ui.gameCanvas.height / 2);
	this.gameCtx.rotate(Math.atan2(sorcerio.input.mouseCoords.x - sorcerio.ui.gameCanvas.width / 2, -(sorcerio.input.mouseCoords.y - sorcerio.ui.gameCanvas.height / 2)));
	this.gameCtx.drawImage(sorcerio.media.sprites.playerGreen, -sorcerio.media.sprites.playerGreen.width / 2, -sorcerio.media.sprites.playerGreen.height / 2);
	this.gameCtx.restore();
}.bind(sorcerio.renderer);

sorcerio.renderer.renderGrid = function() {
	this.grid.xOffset = this.grid.xOffset % this.grid.gridSize;
	this.grid.yOffset = this.grid.yOffset % this.grid.gridSize;
	this.gridCtx.lineWidth = this.grid.lineWidth;
	this.gridCtx.fillStyle = this.grid.backgroundColor;
	this.gridCtx.fillRect(0, 0, sorcerio.ui.gridCanvas.width, sorcerio.ui.gridCanvas.height);
	this.gridCtx.strokeStyle = this.grid.lineColor;
	this.gridCtx.beginPath();
	this.gridCtx.moveTo(0, 0);
	for (let i = 0; i < sorcerio.ui.gridCanvas.width + this.grid.gridSize; i += this.grid.gridSize) {
		this.gridCtx.moveTo(i + this.grid.xOffset, 0);
		this.gridCtx.lineTo(i + this.grid.xOffset, sorcerio.ui.gridCanvas.height);
	}
	for (let i = 0; i < sorcerio.ui.gridCanvas.height + this.grid.gridSize; i += this.grid.gridSize) {
		this.gridCtx.moveTo(0, i + this.grid.yOffset);
		this.gridCtx.lineTo(sorcerio.ui.gridCanvas.width, i + this.grid.yOffset);
	}
	this.gridCtx.stroke();

	//map borders
	this.gridCtx.strokeStyle = this.grid.borderColor;
	this.gridCtx.lineWidth = 40;
	this.gridCtx.beginPath();
	this.gridCtx.moveTo(sorcerio.game.localCoords(0, 'x'), sorcerio.game.localCoords(0, 'y'));
	this.gridCtx.lineTo(sorcerio.game.localCoords(sorcerio.game.latestAuthoritativeGameState.mapSize, 'x'), sorcerio.game.localCoords(0, 'y'));
	this.gridCtx.lineTo(sorcerio.game.localCoords(sorcerio.game.latestAuthoritativeGameState.mapSize, 'x'), sorcerio.game.localCoords(sorcerio.game.latestAuthoritativeGameState.mapSize, 'y'));
	this.gridCtx.lineTo(sorcerio.game.localCoords(0, 'x'), sorcerio.game.localCoords(sorcerio.game.latestAuthoritativeGameState.mapSize, 'y'));
	this.gridCtx.lineTo(sorcerio.game.localCoords(0, 'x'), sorcerio.game.localCoords(0, 'y') - this.gridCtx.lineWidth / 2);
	this.gridCtx.stroke();
}.bind(sorcerio.renderer);


///////
//@UI//
///////


sorcerio.ui.init = function() {
	this.gameCanvas = document.querySelector("#gameCanvas");
	this.gridCanvas = document.querySelector("#gridCanvas");

	gameCanvas.width = devicePixelRatio * innerWidth;
	gameCanvas.height = devicePixelRatio * innerHeight;
	gridCanvas.width = devicePixelRatio * innerWidth;
	gridCanvas.height = devicePixelRatio * innerHeight;

	window.addEventListener("resize", function() {
		gridCanvas.width = devicePixelRatio * innerWidth;
		gridCanvas.height = devicePixelRatio * innerHeight;
		gameCanvas.width = devicePixelRatio * innerWidth;
		gameCanvas.height = devicePixelRatio * innerHeight;
		gameCanvas.style.transform = `scale(${innerWidth/gameCanvas.width})`;
		gridCanvas.style.transform = `scale(${innerWidth/gridCanvas.width})`;
		gridCanvas.width = innerWidth;
		gridCanvas.height = innerHeight;
		gameCanvas.width = innerWidth;
		gameCanvas.height = innerHeight;
	});

	this.playButton = document.querySelector("#playButton");
	this.nicknameInput = document.querySelector("#nicknameInput");
	this.nicknameInput.addEventListener('keydown', function(e) {
		if (e.key === 'Enter') {
			sorcerio.ui.playButton.click();
		}
	});

	this.mainScreen = document.querySelector("#mainScreen");
	this.spellWrapper = document.querySelector("#spellWrapper");
}.bind(sorcerio.ui);

sorcerio.ui.setup = function() {
	this.createHotbarSlots();
}.bind(sorcerio.ui);

sorcerio.ui.createHotbarSlots = function() {
	for (let i = 1; i < sorcerio.meta.data.inventorySize + 1; i++) {//creates slotImage and coolDownDisplay
		let coolDownDisplay = document.createElement("div");
		coolDownDisplay.className = "coolDownDisplay";
		coolDownDisplay.id = `coolDownDisplay${i}`;
		coolDownDisplay.style.animation = "none";
		this.spellWrapper.appendChild(coolDownDisplay);

		let slotImage = sorcerio.media.createImage(sorcerio.media.inventoryItems.emptySlot.unselected);
		slotImage.addEventListener("dragstart", function(e) {
			e.preventDefault();
		});
		slotImage.id = `inventorySlot${i}`;
		slotImage.className = "inventorySlot"
		spellWrapper.appendChild(slotImage);
	}

	let openStorage = sorcerio.media.createImage("/media/images/openStorage.png");
	openStorage.className = "inventorySlot";
	openStorage.addEventListener("dragstart", function(e) {
		e.preventDefault();
	});
	this.spellWrapper.appendChild(openStorage);
}.bind(sorcerio.ui);

sorcerio.ui.hideMainScreen = function() {
	this.mainScreen.style.display = "none";
}.bind(sorcerio.ui);

sorcerio.ui.showMainScreen = function() {
	this.mainScreen.style.display = "";
	this.mainScreen.style.animationName = "";
	this.mainScreen.style.animationName = "death";
}.bind(sorcerio.ui);

sorcerio.ui.generatePlayerConfig = function() {
	let cfg = {
		nickname: this.nicknameInput.value
	};

	return JSON.stringify(cfg);
}.bind(sorcerio.ui);


//////////
//@MEDIA//
//////////


sorcerio.media.init = function() {
	this.inventoryItems = {};
	this.sounds = {spellSounds: {}};
	this.sprites = {};

	this.inventoryItems.emptySlot = {
		unselected: "/media/images/inventorySlot.png",
		selected: "/media/images/inventorySlotSelected.png"
	};

	for (let i = 0; i < sorcerio.meta.data.spellTypes.length; i++) {
		const type = sorcerio.meta.data.spellTypes[i];

		this.inventoryItems[type] = {
			selected: `/media/images/${type}SpellSelected.png`,
			unselected: `/media/images/${type}Spell.png`
		};

		this.sounds.spellSounds[type] = this.createSound(`/media/sounds/${type}Spell`);
	}

	this.sprites.playerRed = this.createImage('/media/images/playerRed.png');
	this.sprites.playerGreen = this.createImage('/media/images/playerGreen.png');
}.bind(sorcerio.media);

sorcerio.media.createImage = function(url) {
	let image = document.createElement("img");
	image.src = url;
	return image;
};

sorcerio.media.createSound = function(url) {//creates a sound with sources {url}.ogg and {url}.mp3
	let sound = document.createElement("audio");
	let mp3 = document.createElement("source");
	let ogg = document.createElement("source");
	mp3.type = "audio/mp3";
	ogg.type = "audio/ogg";
	mp3.src = `${url}.mp3`;
	ogg.src = `${url}.ogg`;
	sound.appendChild(mp3);
	sound.appendChild(ogg);
	return sound;
};

/////////
//@COMM//
/////////


sorcerio.comm.init = function() {
	this.ws = null;
}.bind(sorcerio.comm);

sorcerio.comm.newWSConnection = function() {
	this.ws = new WebSocket(`ws${(window.location.protocol==="https:")?"s":""}://${window.location.host}/ws`);

	this.ws.addEventListener("open", function() {
		sorcerio.comm.ws.send(sorcerio.ui.generatePlayerConfig());
	});

	this.ws.addEventListener("message", function(message) {
		sorcerio.events.handleServerMessage(JSON.parse(message.data));
	});
}.bind(sorcerio.comm);


///////////
//@EVENTS//
///////////


sorcerio.events.init = function() {
	this.isPlaying = false;//if the client is currently in a game
}.bind(sorcerio.events);

sorcerio.events.setup = function() {
	sorcerio.ui.playButton.addEventListener("click", this.playButtonClick);
	window.addEventListener("mousemove", this.mouseMove);
	window.addEventListener("keydown", this.keyDown);
	window.addEventListener("blur", this.onWindowBlur);
	window.addEventListener("keyup", this.keyUp);
}.bind(sorcerio.events);

sorcerio.events.playButtonClick = function() {
	if (this.isPlaying) {
		return;
	}

	sorcerio.events.startNewGame();

	this.isPlaying = true;
}.bind(sorcerio.events);

sorcerio.events.startNewGame = function() {
	sorcerio.comm.newWSConnection();
};

sorcerio.events.newGameStarted = function() {
	sorcerio.ui.hideMainScreen();
	window.requestAnimationFrame(sorcerio.mainLoop);
};

sorcerio.events.handleServerMessage = function(message) {
	const messageType = message.type;

	switch (messageType) {
		case "yourId":
			sorcerio.game.myPlayerId = message.id;
			sorcerio.events.newGameStarted();
			break;
		case "update":
			sorcerio.game.latestAuthoritativeGameState = message;
			let myPlayer = message.players.find(function(element) {return element.id === sorcerio.game.myPlayerId;});
			if (myPlayer !== undefined) {
				sorcerio.game.myPlayer = myPlayer;
			}
			break;
	}
};

sorcerio.events.mouseMove = function(domEvent) {
	sorcerio.input.mouseCoords.x = domEvent.pageX;
	sorcerio.input.mouseCoords.y = domEvent.pageY;
};

sorcerio.events.keyDown = function(e) {
	switch (e.key.toLowerCase()) {
		case sorcerio.input.controls.up:
			sorcerio.input.keyStates.u = true;
			break;
		case sorcerio.input.controls.down:
			sorcerio.input.keyStates.d = true;
			break;
		case sorcerio.input.controls.left:
			sorcerio.input.keyStates.l = true;
			break;
		case sorcerio.input.controls.right:
			sorcerio.input.keyStates.r = true;
			break;
	}
};

sorcerio.events.keyUp = function(e) {
	switch (e.key.toLowerCase()) {
		case sorcerio.input.controls.up:
			sorcerio.input.keyStates.u = false;
			break;
		case sorcerio.input.controls.down:
			sorcerio.input.keyStates.d = false;
			break;
		case sorcerio.input.controls.left:
			sorcerio.input.keyStates.l = false;
			break;
		case sorcerio.input.controls.right:
			sorcerio.input.keyStates.r = false;
			break;
	}
};

sorcerio.events.onWindowBlur = function() {
	sorcerio.input.keyStates.r = false;
	sorcerio.input.keyStates.l = false;
	sorcerio.input.keyStates.d = false;
	sorcerio.input.keyStates.u = false;
};


/////////
//@GAME//
/////////


sorcerio.game.init = function() {
	this.latestAuthoritativeGameState = null;
	this.myPlayerId = null;
	this.myPlayer = null;
}.bind(sorcerio.game);


sorcerio.game.localCoords = function(globalCoord, xOrY) {
	if (sorcerio.game.myPlayer === null) {
		return 0;
	}

	if (xOrY === "x") {
		return (globalCoord + sorcerio.ui.gameCanvas.width / 2 - sorcerio.game.myPlayer.location.x);
	} else if (xOrY === "y") {
		return (globalCoord + sorcerio.ui.gameCanvas.height / 2 - sorcerio.game.myPlayer.location.y);
	}
}.bind(sorcerio.game);


sorcerio.game.globalCoords = function(localCoord, xOrY) {
	if (sorcerio.game.myPlayer === null) {
		return 0;
	}

	if (xOrY === "x") {
		return (localCoord - sorcerio.ui.gameCanvas.width / 2 + sorcerio.game.myPlayer.location.x);
	} else if (xOrY === "y") {
		return (localCoord - sorcerio.ui.gameCanvas.height / 2 + sorcerio.game.myPlayer.location.y);
	}
}.bind(sorcerio.game);


sorcerio.game.calculatePlayerAngle = function(player) {
	return Math.atan2(player.facing.x - player.location.x, -(player.facing.y - player.location.y));
};


///////////
//@INPUTS//
///////////


sorcerio.input.init = function() {
	this.mouseCoords = {x: 0, y: 0};
	this.inputSendInterval = 10;
	this.lastInputSendTime = 0;
	this.controls = {
		up: "w",
		down: "s",
		left: "a",
		right: "d"
	};
	this.keyStates = {
		u: false,
		d: false,
		l: false,
		r: false
	};
}.bind(sorcerio.input);

//gets a JSON string of the current input states to send to the server
sorcerio.input.getInput = function() {
	return JSON.stringify({
		movement: {
			facing: this.mouseCoords,
			keys: this.keyStates
		}
	});
}.bind(sorcerio.input);

//////////////////////
////END OF MODULES////
//////////////////////

window.addEventListener("load", function() {
	fetch("/meta.json").then(function(resp){return resp.json();}).then(function(metadata) {
		sorcerio.meta.data = metadata;
		sorcerio.init();
	});
});

//})();
