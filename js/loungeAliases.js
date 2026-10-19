/*
 * Wild Ledger · temporary Community Lounge names
 *
 * 250 English adjectives × 250 English nouns = 62,500 combinations.
 * Assign locally after wallet verification; never treat an alias as identity.
 * The Lounge decides when a session begins and ends. This module does not
 * connect to a wallet, persist names, or contact a translation API.
 *
 * English words are canonical IDs. Later language packs translate the SAME
 * word IDs rather than changing which alias pair a session was assigned.
 */

export const LOUNGE_ALIAS_ADJECTIVES = Object.freeze([
  "Rancid", "Salty", "Confused", "Pickled", "Suspicious", "Wobbly", "Disgruntled", "Ferocious",
  "Dizzy", "Reckless", "Grumpy", "Sneaky", "Wacky", "Cranky", "Bonkers", "Jittery",
  "Soggy", "Squishy", "Crusty", "Dusty", "Gassy", "Spicy", "Cheeky", "Goofy",
  "Scruffy", "Barnacled", "Briny", "Windblown", "Seasick", "Dripping", "Rusty", "Leaky",
  "Squeaky", "Wonky", "Clumsy", "Baffled", "Bumbling", "Fumbling", "Drenched", "Tattered",
  "Frayed", "Tangled", "Crooked", "Wiggly", "Jiggly", "Flustered", "Frazzled", "Bewildered",
  "Startled", "Stunned", "Huffy", "Puffy", "Snarky", "Feisty", "Fuzzy", "Fluffy",
  "Hairy", "Bald", "Muddy", "Slimy", "Sticky", "Gooey", "Greasy", "Crispy",
  "Toasty", "Charred", "Smoky", "Frosty", "Chilly", "Steamy", "Sweaty", "Itchy",
  "Prickly", "Ticklish", "Smelly", "Shabby", "Shiny", "Sparkly", "Glittery", "Dazzling",
  "Neon", "Polka-Dotted", "Stripy", "Spotty", "Patchy", "Wrinkled", "Rumpled", "Crumpled",
  "Lopsided", "Upside-Down", "Sideways", "Backward", "Zigzag", "Swirly", "Twisty", "Curly",
  "Spiky", "Knobbly", "Bumpy", "Lumpy", "Buttery", "Cheesy", "Peppery", "Sugary",
  "Syrupy", "Tangy", "Tart", "Zesty", "Bitter", "Sour", "Sweet", "Savory",
  "Nutty", "Crunchy", "Chewy", "Creamy", "Mushy", "Runny", "Juicy", "Drippy",
  "Fizzy", "Bubbly", "Foamy", "Frothy", "Chunky", "Nervous", "Excitable", "Dramatic",
  "Melodramatic", "Sleepy", "Drowsy", "Giggly", "Chuckling", "Cackling", "Cautious", "Clueless",
  "Oblivious", "Stubborn", "Impatient", "Eager", "Overconfident", "Bashful", "Shy", "Moody",
  "Brooding", "Thrilled", "Annoyed", "Puzzled", "Perplexed", "Bewitched", "Galactic", "Cosmic",
  "Lunar", "Solar", "Stardusty", "Electric", "Magnetic", "Radioactive", "Mythical", "Legendary",
  "Mysterious", "Enchanted", "Haunted", "Spooky", "Ghostly", "Invisible", "Miniature", "Gigantic",
  "Tiny", "Colossal", "Pocket-Sized", "Supersonic", "Turbocharged", "Gravity-Defying", "Wondrous", "Regal",
  "Royal", "Fancy", "Posh", "Dapper", "Dashing", "Proper", "Princely", "Majestic",
  "Grandiose", "Flamboyant", "Dainty", "Elegant", "Ostentatious", "Extravagant", "Scrappy", "Rowdy",
  "Rambunctious", "Noisy", "Boisterous", "Loud", "Hushed", "Muffled", "Silent", "Stoic",
  "Bouncy", "Hopping", "Skipping", "Galloping", "Tumbling", "Rolling", "Waddling", "Shuffling",
  "Scuttling", "Floating", "Drifting", "Wandering", "Meandering", "Roaming", "Sprinting", "Crawling",
  "Stumbling", "Somersaulting", "Pirouetting", "Bobbing", "Flailing", "Whirling", "Hiccuping", "Snoring",
  "Yawning", "Unhinged", "Misplaced", "Misguided", "Befuddled", "Unruly", "Peculiar", "Curious",
  "Questionable", "Dubious", "Unlikely", "Improbable", "Accidental", "Unintentional", "Misunderstood", "Forgotten",
  "Secretive", "Cryptic", "Ridiculous", "Absurd", "Ludicrous", "Preposterous", "Nonsensical", "Nifty",
  "Noodle-Armed", "Clockwork"
]);

export const LOUNGE_ALIAS_NOUNS = Object.freeze([
  "Wombat", "Pelican", "Barracuda", "Flamingo", "Barnacle", "Mongoose", "Walrus", "Turnip",
  "Pufferfish", "Platypus", "Weasel", "Seahorse", "Squid", "Narwhal", "Otter", "Badger",
  "Possum", "Ferret", "Lemur", "Meerkat", "Capybara", "Pangolin", "Quokka", "Tapir",
  "Armadillo", "Penguin", "Puffin", "Toucan", "Albatross", "Seagull", "Cormorant", "Heron",
  "Egret", "Ibis", "Tern", "Gull", "Loon", "Osprey", "Kestrel", "Sparrow",
  "Magpie", "Raven", "Crow", "Cockatoo", "Parrot", "Budgie", "Kiwi", "Cassowary",
  "Ostrich", "Emu", "Octopus", "Cuttlefish", "Jellyfish", "Starfish", "Clam", "Mussel",
  "Oyster", "Scallop", "Lobster", "Shrimp", "Prawn", "Krill", "Crab", "Crayfish",
  "Urchin", "Anemone", "Coral", "Nudibranch", "Anchovy", "Sardine", "Herring", "Mackerel",
  "Haddock", "Halibut", "Flounder", "Dolphin", "Orca", "Manatee", "Dugong", "Seal",
  "Salmon", "Trout", "Eel", "Moray", "Manta", "Stingray", "Shark", "Whale",
  "Porpoise", "Turtle", "Terrapin", "Gecko", "Iguana", "Chameleon", "Axolotl", "Salamander",
  "Toad", "Frog", "Newt", "Hedgehog", "Porcupine", "Squirrel", "Chipmunk", "Groundhog",
  "Marmot", "Beaver", "Muskrat", "Raccoon", "Skunk", "Fox", "Coyote", "Jackal",
  "Hyena", "Dingo", "Alpaca", "Llama", "Yak", "Bison", "Moose", "Elk",
  "Reindeer", "Antelope", "Gazelle", "Giraffe", "Koala", "Kangaroo", "Wallaby", "Bilby",
  "Numbat", "Echidna", "Sloth", "Anteater", "Aardvark", "Okapi", "Zebra", "Baboon",
  "Mandrill", "Gibbon", "Gorilla", "Orangutan", "Chimpanzee", "Macaque", "Marmoset", "Tamarin",
  "Tarsier", "Bushbaby", "Civet", "Tarantula", "Scorpion", "Beetle", "Ladybug", "Firefly",
  "Dragonfly", "Damselfly", "Grasshopper", "Cricket", "Katydid", "Cicada", "Mantis", "Stickbug",
  "Earwig", "Weevil", "Moth", "Butterfly", "Caterpillar", "Centipede", "Millipede", "Pillbug",
  "Isopod", "Snail", "Slug", "Earthworm", "Leech", "Pretzel", "Waffle", "Pancake",
  "Pickle", "Dumpling", "Noodle", "Ravioli", "Gnocchi", "Tater", "Tot", "Bagel",
  "Biscuit", "Muffin", "Crumpet", "Scone", "Croissant", "Meatball", "Falafel", "Fritter",
  "Churro", "Doughnut", "Cupcake", "Marshmallow", "Jellybean", "Popcorn", "Teapot", "Kettle",
  "Spatula", "Ladle", "Whisk", "Colander", "Toaster", "Blender", "Saucer", "Teacup",
  "Goblet", "Tumbler", "Thermos", "Corkscrew", "Doorknob", "Doorstop", "Lampshade", "Umbrella",
  "Shoelace", "Slipper", "Sock", "Mitten", "Handkerchief", "Backpack", "Parasol", "Captain",
  "Skipper", "Buccaneer", "Corsair", "Pirate", "Castaway", "Stowaway", "Deckhand", "Navigator",
  "Lookout", "Swabbie", "SeaDog", "Landlubber", "Kraken", "Mermaid", "Goblin", "Gnome",
  "Gremlin", "Troll", "Pixie", "Sprite", "Gargoyle", "Dragon", "Unicorn", "Griffin",
  "Phoenix", "Yeti"
]);

export const LOUNGE_ALIAS_COMBINATIONS =
  LOUNGE_ALIAS_ADJECTIVES.length * LOUNGE_ALIAS_NOUNS.length;

const adjectivesById = new Map(
  LOUNGE_ALIAS_ADJECTIVES.map(word => [word.toLowerCase(), word])
);
const nounsById = new Map(
  LOUNGE_ALIAS_NOUNS.map(word => [word.toLowerCase(), word])
);
const localePacks = new Map();

function localeName(locale) {
  if (typeof locale !== "string") return "en";
  return locale.trim().replaceAll("_", "-").toLowerCase() || "en";
}

function languagePack(locale) {
  const normalized = localeName(locale);
  const base = normalized.split("-")[0];
  return localePacks.get(normalized) || localePacks.get(base) || null;
}

/**
 * Optional future localization layer. Each dictionary is keyed by the
 * lowercase English word ID (e.g. "rancid", "wombat"). Missing translations
 * fall back to the entire original English alias, never a mixed-language name.
 *
 * A format function can handle language-specific adjective agreement/order:
 *   format({ adjective, noun, adjectiveId, nounId }) => displayString
 * Entries may therefore be strings or language-specific grammatical records.
 * Do not translate names through a network call during Lounge entry.
 */
export function registerLoungeAliasLocale(locale, { adjectives, nouns, format } = {}) {
  const id = localeName(locale);
  if (id === "en" || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(id)) {
    throw new TypeError("Register a valid non-English locale, such as ar or zh-CN.");
  }
  if (!adjectives || !nouns || typeof adjectives !== "object" || typeof nouns !== "object") {
    throw new TypeError("A language pack needs adjective and noun dictionaries.");
  }
  if (format !== undefined && typeof format !== "function") {
    throw new TypeError("Language-pack format must be a function.");
  }
  for (const key of Object.keys(adjectives)) {
    if (!adjectivesById.has(key)) throw new TypeError(`Unknown adjective ID: ${key}`);
  }
  for (const key of Object.keys(nouns)) {
    if (!nounsById.has(key)) throw new TypeError(`Unknown noun ID: ${key}`);
  }
  localePacks.set(id, {
    adjectives: Object.assign(Object.create(null), adjectives),
    nouns: Object.assign(Object.create(null), nouns),
    format
  });
}

/** Display a previously assigned pair without assigning a different identity. */
export function formatLoungeAlias(alias, locale = "en") {
  const adjectiveId = alias?.adjectiveId;
  const nounId = alias?.nounId;
  const englishAdjective = adjectivesById.get(adjectiveId);
  const englishNoun = nounsById.get(nounId);
  if (!englishAdjective || !englishNoun) {
    throw new TypeError("Unknown Lounge alias word IDs.");
  }
  const english = `${englishAdjective} ${englishNoun}`;
  const pack = languagePack(locale);
  if (!pack) return english;

  const adjective = pack.adjectives[adjectiveId];
  const noun = pack.nouns[nounId];
  if (adjective === undefined || noun === undefined) return english;
  if (pack.format) {
    const translated = pack.format({ adjective, noun, adjectiveId, nounId });
    return typeof translated === "string" && translated.trim() ? translated.trim() : english;
  }
  return typeof adjective === "string" && typeof noun === "string" &&
    adjective.trim() && noun.trim() ? `${adjective.trim()} ${noun.trim()}` : english;
}

function occupiedNames(inUse) {
  const occupied = new Set();
  for (const item of inUse ?? []) {
    if (typeof item === "string") {
      occupied.add(item.trim().toLowerCase());
    } else if (item && typeof item === "object") {
      for (const name of [item.key, item.canonical, item.display, item.name]) {
        if (typeof name === "string") occupied.add(name.trim().toLowerCase());
      }
    }
  }
  return occupied;
}

/**
 * Assign a two-word alias. Pass current LIVE participants as inUse to avoid
 * duplicate names in that room; no alias directory or saved visitor profile.
 * The key, not the displayed words, is stable across future translations.
 * A caller may supply random for deterministic tests.
 */
export function generateLoungeAlias({ locale = "en", inUse = [], random = Math.random } = {}) {
  if (typeof random !== "function") throw new TypeError("random must be a function.");
  const draw = random();
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) {
    throw new RangeError("random must return a number between 0 (inclusive) and 1 (exclusive).");
  }
  const occupied = occupiedNames(inUse);
  const nounCount = LOUNGE_ALIAS_NOUNS.length;
  const start = Math.floor(draw * LOUNGE_ALIAS_COMBINATIONS);

  // Random first selection, then immediate deterministic collision resolution.
  // No repeat requests, network operations, delays, or unbounded retry loop.
  for (let offset = 0; offset < LOUNGE_ALIAS_COMBINATIONS; offset++) {
    const index = (start + offset) % LOUNGE_ALIAS_COMBINATIONS;
    const adjective = LOUNGE_ALIAS_ADJECTIVES[Math.floor(index / nounCount)];
    const noun = LOUNGE_ALIAS_NOUNS[index % nounCount];
    const adjectiveId = adjective.toLowerCase();
    const nounId = noun.toLowerCase();
    const key = `${adjectiveId}:${nounId}`;
    const canonical = `${adjective} ${noun}`;
    const display = formatLoungeAlias({ adjectiveId, nounId }, locale);
    if (occupied.has(key.toLowerCase()) || occupied.has(canonical.toLowerCase()) ||
        occupied.has(display.toLowerCase())) continue;
    return Object.freeze({ key, adjectiveId, nounId, canonical, display });
  }
  throw new Error("All 62,500 Lounge alias combinations are in use.");
}
