///generic spell stuff
module sorcerio.gameServer.spell;

import std.json : JSONValue;

public import sorcerio.gameServer.spells;
import sorcerio : millis;
import sorcerio.gameServer.server;
import sorcerio.gameServer.player;
import sorcerio.gameServer.config;

enum SpellName {
	fire,
	cannon,
	slow,
	freeze,
	blind,
	heal,
	bomb,
	invisible,
	teleport,
	speed,
	shock
}

///generates a JSON array of all spell types, used for /public/spells.json
JSONValue generateSpellTypesJSON() {
	import std.traits;
	import std.conv;

	string[] types;
	foreach (member; [EnumMembers!SpellName]) {
		types ~= member.to!string;
	}

	return JSONValue(types);
}

final class InventorySpell {
	immutable SpellName name;
	private immutable uint coolDownTime;
	private long timeOfLastCast;
	private Player owner;///the player whose inventory contains this

	static JSONValue JSONofInventory(InventorySpell[CONFIG.inventorySize] inventory) {
		JSONValue[] inventorySpellsJSON;

		foreach (spell; inventory) {
			if (spell is null) {
				continue;
			}

			inventorySpellsJSON ~= spell.JSONof();
		}

		return JSONValue(inventorySpellsJSON);
	}

	JSONValue JSONof() {
		import std.conv;

		JSONValue json = JSONValue();

		json["spellName"] = name.to!string;
		json["coolDownTime"] = coolDownTime;

		return json;
	}

	bool isCooling() {
		if (millis() - timeOfLastCast >= coolDownTime) {
			return false;
		}
		return true;
	}

	///trys to cast the spell, returns whether or not it was actually casted
	bool castSpell(Server game) {
		if (isCooling) {
			return false;
		}

		game.addSpell(SpellFactory.createSpell(name, owner));

		timeOfLastCast = millis();
		return true;
	}

	this(SpellName name, Player owner) {
		this.name = name;
		this.coolDownTime = SpellFactory.getCoolDownTime(name);
		this.timeOfLastCast = 0;
		this.owner = owner;
	}
}

private class RegistryEntry {
	Spell spell;
	uint coolDownTime;///the coolDownTime of the inventory spell

	this(Spell spell, uint coolDownTime) {
		this.spell = spell;
		this.coolDownTime = coolDownTime;
	}
}

final class SpellFactory {
	private static RegistryEntry[SpellName] registry;

	static void registerSpell(SpellName name, uint coolDownTime, Spell spell) {
		if (name !in registry) {
			registry[name] = new RegistryEntry(spell, coolDownTime);
		} else {
			throw new Exception("Spell already registered");
		}
	}

	static Spell createSpell(SpellName name, Player caster) {
		return registry[name].spell.create(caster);
	}

	static uint getCoolDownTime(SpellName name) {
		return registry[name].coolDownTime;
	}
}


mixin template registerSpell(SpellName name, uint coolDownTime) {
	static this() {
		SpellFactory.registerSpell(name, coolDownTime, new typeof(this));
	}

	private this() {}

	this(Player caster) {
		this.caster = caster;
		initialize();
	}

	override Spell create(Player caster) {
		return new typeof(this)(caster);
	}
}


abstract class Spell {
	bool removalFlag = false;///flags the spell to be removed from Server.spells on the next tick. ALWAYS use removalFlag instead of directly removing the spell from the Server.spells array.

	protected Player caster;

	abstract Spell create(Player caster);

	///called once, right after object creation
	abstract void initialize();

	abstract void tick(Server gameState);

	///returns a string describing the effects of the spell
	abstract string humanReadableEffect();
}
