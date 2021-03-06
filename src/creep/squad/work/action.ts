/* 四人小队基本行为 */

import { SquadDirection, crossConst, leftConst, rightConst, tactical } from './constant'
import { getSquadCreepAtPos, getSquadHealDirection, getSquadRoomPosition, getSquadStandPos } from './state'

/* 小队战术动作 斜插 */
export function SquadCross(SquadData: Squad): void {
  for (const cName in SquadData) {
    if (Game.creeps[cName] && Game.creeps[cName].fatigue)
      return
  }
  for (const cName in SquadData) {
    if (!Game.creeps[cName])
      continue
    Game.creeps[cName].move(SquadDirection[crossConst[SquadData[cName].position] as keyof typeof SquadDirection])
    SquadData[cName].position = tactical.cross[SquadData[cName].position] as '↘' | '↗' | '↖' | '↙'
  }
}

/* 小队战术动作 右转 */
export function SquadRight(SquadData: Squad): void {
  for (const cName in SquadData) {
    if (Game.creeps[cName] && Game.creeps[cName].fatigue)
      return
  }
  for (const cName in SquadData) {
    if (!Game.creeps[cName])
      continue
    Game.creeps[cName].move(SquadDirection[rightConst[SquadData[cName].position] as keyof typeof SquadDirection])
    SquadData[cName].position = tactical.right[SquadData[cName].position] as '↘' | '↗' | '↖' | '↙'
  }
}

/* 小队战术动作 左转 */
export function SquadLeft(SquadData: Squad): void {
  for (const cName in SquadData) {
    if (Game.creeps[cName] && Game.creeps[cName].fatigue)
      return
  }
  for (const cName in SquadData) {
    if (!Game.creeps[cName])
      continue
    Game.creeps[cName].move(SquadDirection[leftConst[SquadData[cName].position] as keyof typeof SquadDirection])
    SquadData[cName].position = tactical.left[SquadData[cName].position] as '↘' | '↗' | '↖' | '↙'
  }
}

/* 进入目标房间前使用  治疗爬方向朝向目标房间的入口 */
export function initSquad(thisRoom: string, disRoom: string, SquadData: Squad): void {
  const healDirection = getSquadHealDirection(SquadData)
  if (healDirection == null) {

  }
  else if (healDirection === '←') {
    switch (Game.rooms[thisRoom].findExitTo(disRoom)) {
      case FIND_EXIT_LEFT:{ break }
      case FIND_EXIT_RIGHT:{ SquadCross(SquadData); break }
      case FIND_EXIT_BOTTOM:{ SquadLeft(SquadData); break }
      case FIND_EXIT_TOP:{ SquadRight(SquadData); break }
    }
  }
  else if (healDirection === '→') {
    switch (Game.rooms[thisRoom].findExitTo(disRoom)) {
      case FIND_EXIT_LEFT:{ SquadCross(SquadData); break }
      case FIND_EXIT_RIGHT:{ break }
      case FIND_EXIT_BOTTOM:{ SquadRight(SquadData); break }
      case FIND_EXIT_TOP:{ SquadLeft(SquadData); break }
    }
  }
  else if (healDirection === '↑') {
    switch (Game.rooms[thisRoom].findExitTo(disRoom)) {
      case FIND_EXIT_LEFT:{ SquadLeft(SquadData); break }
      case FIND_EXIT_RIGHT:{ SquadRight(SquadData); break }
      case FIND_EXIT_BOTTOM:{ SquadCross(SquadData); break }
      case FIND_EXIT_TOP:{ break }
    }
  }
  else if (healDirection === '↓') {
    switch (Game.rooms[thisRoom].findExitTo(disRoom)) {
      case FIND_EXIT_LEFT:{ SquadRight(SquadData); break }
      case FIND_EXIT_RIGHT:{ SquadLeft(SquadData); break }
      case FIND_EXIT_BOTTOM:{ break }
      case FIND_EXIT_TOP:{ SquadCross(SquadData); break }
    }
  }
}

/* 根据小队攻击爬的方向和目标方向进行战术动作 使得攻击爬方向朝向目标方向 */
export function squadAttackOrient(Attackdirection: string, direction_: string, SquadData: Squad): void {
  /* 根据自己的方向进行旋转 */
  if (Attackdirection === '←') {
    switch (direction_) {
      case '←':{ break }
      case '→':{ SquadCross(SquadData); break }
      case '↓':{ SquadLeft(SquadData); break }
      case '↑':{ SquadRight(SquadData); break }
    }
  }
  else if (Attackdirection === '→') {
    switch (direction_) {
      case '←':{ SquadCross(SquadData); break }
      case '→':{ break }
      case '↓':{ SquadRight(SquadData); break }
      case '↑':{ SquadLeft(SquadData); break }
    }
  }
  else if (Attackdirection === '↑') {
    switch (direction_) {
      case '←':{ SquadLeft(SquadData); break }
      case '→':{ SquadRight(SquadData); break }
      case '↓':{ SquadCross(SquadData); break }
      case '↑':{ break }
    }
  }
  else if (Attackdirection === '↓') {
    switch (direction_) {
      case '←':{ SquadRight(SquadData); break }
      case '→':{ SquadLeft(SquadData); break }
      case '↓':{ break }
      case '↑':{ SquadCross(SquadData); break }
    }
  }
}

/* 小队所有队员各就各位 */
export function steadySquad(SquadData: Squad): void {
  for (const i in SquadData) {
    if (!Game.creeps[i])
      continue
    const disPos = getSquadRoomPosition(SquadData, SquadData[i].position)
    if (!disPos)
      continue

    // 用不同的移动方式防止各种bug
    if (Game.time % 3)
      Game.creeps[i].moveTo(disPos)
    else Game.creeps[i].goTo(disPos, 0)
  }
}

/* 小队寻找旗帜 */
export function getClosestSquadColorFlagByRange(SquadData: Squad, color: ColorConstant): Flag | undefined {
  // 先寻找小队左上角的坐标
  const standedCreep = getSquadCreepAtPos(SquadData, '↖')
  if (!standedCreep)
    return

  const disFlag = standedCreep.pos.findClosestByRange(
    standedCreep.room.find(FIND_FLAGS)
      .filter(flag => flag.color === color))
  if (disFlag)
    return disFlag
}

/* 小队寻找某类旗帜 */
export function squadNameFlagPath(SquadData: Squad, name: string): Flag | undefined {
  const pos_ = getSquadStandPos(SquadData)
  if (!pos_)
    return
  const disFlag = pos_.findClosestByPath(FIND_FLAGS, {
    filter: (flag) => {
      return flag.name.indexOf(name) === 0
    },
  })
  if (disFlag)
    return disFlag
}

export function squadNameFlagRange(SquadData: Squad, name: string): Flag | undefined {
  const pos_ = getSquadStandPos(SquadData)
  if (!pos_)
    return
  const disFlag = pos_.findClosestByRange(FIND_FLAGS, {
    filter: (flag) => {
      return flag.name.indexOf(name) === 0
    },
  })
  if (disFlag)
    return disFlag
}

/* 小队行为 */
export function squadAction(SquadData: Squad): void {
  for (const i in SquadData) {
    const creep = Game.creeps[i]
    if (!creep)
      continue
    /* 治疗类型爬 */
    if (creep.memory.creepType === 'heal') {
      /* 寻找小队内血量最少的爬 */
      let woundCreep: Creep | undefined
      for (const wc in SquadData) {
        if (Game.creeps[wc] && !woundCreep && Game.creeps[wc].hits < Game.creeps[wc].hitsMax)
          woundCreep = Game.creeps[wc]
        if (Game.creeps[wc] && woundCreep) {
          if (Game.creeps[wc].hits < woundCreep.hits)
            woundCreep = Game.creeps[wc]
        }
      }
      if (woundCreep) {
        creep.heal(woundCreep)
      }
      // 如果奶量都满的,就奶攻击爬
      else {
        const index = SquadData[i].index
        let disIndex: number
        if (index === 1)
          disIndex = 0
        else if (index === 3)
          disIndex = 2
        else disIndex = index
        let disCreep: Creep | undefined
        for (const Index in SquadData) {
          if (SquadData[Index].index === disIndex && Game.creeps[Index])
            disCreep = Game.creeps[Index]
        }
        if (!disCreep)
          disCreep = creep
        creep.heal(disCreep)
      }
      // 如果有攻击部件，攻击附近血量最少的爬
      if (creep.getActiveBodyparts('ranged_attack') > 0) {
        const enemy = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
          filter: (creep) => {
            return !Memory.whitelist?.includes(creep.owner.username) && !creep.pos.getStructureWithType('rampart')
          },
        })
        let enemyCreep: Creep | undefined
        if (enemy.length === 0) {
          enemyCreep = enemy[0]
        }
        else if (enemy.length > 1) {
          for (const ec of enemy) {
            if (!enemyCreep) {
              enemyCreep = ec
            }
            else {
              if (ec.hits < enemyCreep.hits)
                enemyCreep = ec
            }
          }
        }
        if (enemyCreep)
          creep.rangedAttack(enemyCreep)

        else
          creep.rangedMassAttack()
        if (creep.memory.role === 'x-aio') {
          /* aio操作 暂缺 */
        }
      }
    }
    // 攻击类型的爬也有可能携带heal部件
    else if (creep.memory.creepType === 'attack') {
      /* 治疗自己 */
      if (creep.getActiveBodyparts('heal') > 0 && creep.hits < creep.hitsMax)
        creep.heal(creep)
      /* 如果有攻击部件，攻击附近血量最少的爬 */
      if (creep.getActiveBodyparts('ranged_attack') > 0) {
        const enemy = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
          filter: (creep) => {
            return !Memory.whitelist?.includes(creep.owner.username) && !creep.pos.getStructureWithType('rampart')
          },
        })
        let enemyCreep: Creep | undefined
        if (enemy.length === 1) {
          enemyCreep = enemy[0]
        }
        else if (enemy.length > 1) {
          for (const ec of enemy) {
            if (!enemyCreep) { enemyCreep = ec }
            else {
              if (ec.hits < enemyCreep.hits)
                enemyCreep = ec
            }
          }
        }
        if (enemyCreep)
          creep.rangedAttack(enemyCreep)

        else
          creep.rangedMassAttack()
      }
      if (creep.getActiveBodyparts('attack') > 0) {
        const enemy = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
          filter: (creep) => {
            return !Memory.whitelist?.includes(creep.owner.username) && !creep.pos.getStructureWithType('rampart')
          },
        })
        if (enemy.length > 0) {
          creep.attack(enemy[0])
        }
        else {
          const flag = creep.pos.findInRange(FIND_FLAGS, 1, {
            filter: (flag) => {
              return flag.name.indexOf('squad_attack') === 0
            },
          })
          if (flag.length > 0) {
            const stru = flag[0].pos.getStructureWithTypes(['rampart', 'extension', 'spawn', 'constructedWall', 'lab', 'nuker', 'powerSpawn', 'factory', 'terminal', 'storage', 'observer', 'extractor', 'tower'])
            if (stru.length > 0)
              creep.attack(stru[0])

            else
              flag[0].remove()
          }
        }
      }
      if (creep.getActiveBodyparts('work') > 0) {
        const flag = creep.pos.findInRange(FIND_FLAGS, 1, {
          filter: (flag) => {
            return flag.name.indexOf('squad_attack') === 0
          },
        })
        if (flag.length > 0) {
          const stru = flag[0].pos.getStructureWithTypes(['rampart', 'extension', 'spawn', 'constructedWall', 'lab', 'nuker', 'powerSpawn', 'factory', 'terminal', 'storage', 'observer', 'extractor', 'tower'])
          if (stru.length > 0)
            creep.dismantle(stru[0])

          else
            flag[0].remove()
        }
      }
    }
  }
}
