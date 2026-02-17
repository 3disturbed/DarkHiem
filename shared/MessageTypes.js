export const MSG = {
  // Connection
  PLAYER_JOIN:        'player:join',
  PLAYER_LEAVE:       'player:leave',
  PLAYER_LIST:        'player:list',

  // Input & State
  INPUT_STATE:        'input:state',
  GAME_STATE:         'game:state',
  GAME_STATE_DELTA:   'game:state:delta',

  // World
  CHUNK_REQUEST:      'chunk:request',
  CHUNK_DATA:         'chunk:data',

  // Combat
  ATTACK:             'combat:attack',
  DAMAGE:             'combat:damage',
  ENTITY_DEATH:       'entity:death',

  // Chat
  CHAT_SEND:          'chat:send',
  CHAT_RECEIVE:       'chat:receive',

  // Inventory
  INVENTORY_UPDATE:   'inventory:update',
  ITEM_USE:           'item:use',
  ITEM_DROP:          'item:drop',
  ITEM_PICKUP:        'item:pickup',
  ITEM_MOVE:          'item:move',

  // Equipment
  EQUIP:              'equip',
  UNEQUIP:            'unequip',
  EQUIPMENT_UPDATE:   'equipment:update',

  // Crafting
  CRAFT_REQUEST:      'craft:request',
  CRAFT_RESULT:       'craft:result',
  STATION_INTERACT:   'station:interact',
  STATION_UPGRADE:    'station:upgrade',
  STATION_PLACE:      'station:place',
  STATION_PLACE_CANCEL: 'station:place:cancel',

  // Upgrade / Augment
  UPGRADE_REQUEST:    'upgrade:request',
  UPGRADE_RESULT:     'upgrade:result',
  AUGMENT_REQUEST:    'augment:request',
  AUGMENT_RESULT:     'augment:result',
  DISMANTLE_REQUEST:  'dismantle:request',
  DISMANTLE_RESULT:   'dismantle:result',

  // Gems
  GEM_SOCKET:         'gem:socket',
  GEM_SOCKET_RESULT:  'gem:socket:result',

  // Gathering
  GATHER_START:       'gather:start',
  GATHER_PROGRESS:    'gather:progress',
  GATHER_COMPLETE:    'gather:complete',

  // Quest
  QUEST_ACCEPT:       'quest:accept',
  QUEST_PROGRESS:     'quest:progress',
  QUEST_COMPLETE:     'quest:complete',
  QUEST_LIST:         'quest:list',

  // Dialog
  DIALOG_START:       'dialog:start',
  DIALOG_CHOICE:      'dialog:choice',
  DIALOG_NODE:        'dialog:node',
  DIALOG_END:         'dialog:end',

  // Shop
  SHOP_OPEN:          'shop:open',
  SHOP_DATA:          'shop:data',
  SHOP_BUY:           'shop:buy',
  SHOP_SELL:          'shop:sell',
  SHOP_RESULT:        'shop:result',

  // Fishing
  FISH_CAST:          'fish:cast',
  FISH_BITE:          'fish:bite',
  FISH_REEL:          'fish:reel',
  FISH_CATCH:         'fish:catch',
  FISH_FAIL:          'fish:fail',
  ROD_PART_ATTACH:    'rod:part:attach',
  ROD_PART_REMOVE:    'rod:part:remove',

  // Farming
  FARM_PLANT:         'farm:plant',
  FARM_WATER:         'farm:water',
  FARM_HARVEST:       'farm:harvest',
  FARM_UPDATE:        'farm:update',
  LAND_PURCHASE:      'land:purchase',

  // Dungeon
  DUNGEON_ENTER:      'dungeon:enter',
  DUNGEON_FLOOR:      'dungeon:floor',
  DUNGEON_LEAVE:      'dungeon:leave',
  DUNGEON_STATE:      'dungeon:state',

  // Boss
  BOSS_SPAWN:         'boss:spawn',
  BOSS_PHASE:         'boss:phase',
  BOSS_DEFEAT:        'boss:defeat',

  // Interaction
  INTERACT:           'interact',
  INTERACT_RESULT:    'interact:result',

  // Player state
  PLAYER_RESPAWN:     'player:respawn',
  PLAYER_STATS:       'player:stats',
  SKILL_UPDATE:       'skill:update',
  SKILL_USE:          'skill:use',
  SKILL_RESULT:       'skill:result',
  SKILL_COOLDOWN:     'skill:cooldown',
  SKILL_HOTBAR_SET:   'skill:hotbar:set',
  DASH_USE:           'dash:use',
  DASH_COOLDOWN:      'dash:cooldown',
  STAT_ALLOCATE:      'stat:allocate',
  LEVEL_UP:           'level:up',

  // Chests
  CHEST_OPEN:         'chest:open',
  CHEST_DATA:         'chest:data',
  CHEST_DEPOSIT:      'chest:deposit',
  CHEST_WITHDRAW:     'chest:withdraw',
  CHEST_CLOSE:        'chest:close',

  // Tile mining
  TILE_UPDATE:        'tile:update',

  // Town recall / travel
  TOWN_RECALL:        'player:recall',
  STATION_TRAVEL:     'station:travel',
  STATION_LIST:       'station:list',

  // Horse
  HORSE_CAPTURE:      'horse:capture',
  HORSE_MOUNT:        'horse:mount',
  HORSE_DISMOUNT:     'horse:dismount',
  HORSE_UPDATE:       'horse:update',

  // World events
  BIOME_UNLOCK:       'world:biome_unlock',
  TIME_UPDATE:        'world:time',
  WEATHER_UPDATE:     'world:weather',

  // Pet system
  PET_CAPTURE:        'pet:capture',
  PET_CAPTURE_RESULT: 'pet:capture:result',
  PET_BATTLE_START:   'pet:battle:start',
  PET_BATTLE_STATE:   'pet:battle:state',
  PET_BATTLE_ACTION:  'pet:battle:action',
  PET_BATTLE_RESULT:  'pet:battle:result',
  PET_BATTLE_END:     'pet:battle:end',
  PET_TEAM_UPDATE:    'pet:team:update',
  PET_TEAM_SET:       'pet:team:set',
  PET_HEAL:           'pet:heal',
  PET_BREED_START:    'pet:breed:start',
  PET_BREED_COLLECT:  'pet:breed:collect',
  PET_TRAIN:          'pet:train',
  PET_TIER_UP:        'pet:tier:up',
  PET_CODEX_UPDATE:   'pet:codex:update',
  PET_RENAME:         'pet:rename',

  // Mail system
  MAIL_JOBS:          'mail:jobs',
  MAIL_ACCEPT:        'mail:accept',
  MAIL_DELIVER:       'mail:deliver',
  MAIL_COLLECT:       'mail:collect',
  MAIL_TURN_IN:       'mail:turnin',

  // Sorting minigame
  SORT_START:         'sort:start',
  SORT_END:           'sort:end',

  // Alchemy minigame
  ALCHEMY_START:      'alchemy:start',
  ALCHEMY_END:        'alchemy:end',

  // Fishmonger minigame
  FISHMONGER_START:   'fishmonger:start',
  FISHMONGER_END:     'fishmonger:end',

  // PVP pet battle
  PVP_CHALLENGE:         'pvp:challenge',
  PVP_CHALLENGE_TIMEOUT: 'pvp:challenge:timeout',
  PVP_BATTLE_START:      'pvp:battle:start',
  PVP_BATTLE_ACTION:     'pvp:battle:action',
  PVP_BATTLE_TURN:       'pvp:battle:turn',
  PVP_BATTLE_END:        'pvp:battle:end',
  PVP_BATTLE_FORFEIT:    'pvp:battle:forfeit',
};
