/* 四人小队寻路 */

import { SquadPos } from '../work/constant'
import { getSquadStandPos, isSquadReady } from '../work/state'

/* squad阵型寻路移动通用函数  为了更好的反应，每一tick的寻路都是实时的，比较消耗cpu (话说都打架了还考虑什么cpu？) */
export function squadMove(squadData: Squad, disPos: RoomPosition, range: number): void {
  const standPos = getSquadStandPos(squadData)
  if (!standPos)
    return
  const result = PathFinder.search(standPos, { pos: disPos, range }, {
    plainCost: 2,
    swampCost: 10,
    maxOps: 4000,
    roomCallback: (roomName) => {
      // 在绕过房间列表的房间将直接不让走
      if (Memory.bypassRooms && Memory.bypassRooms.includes(roomName))
        return false
      const room_ = Game.rooms[roomName]
      const costs = new PathFinder.CostMatrix()
      /** 设置地形 */
      const terrian = new Room.Terrain(roomName)
      /* 第一层设置沼泽 */
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          if (terrian.get(x, y) === TERRAIN_MASK_SWAMP) {
            costs.set(x, y, 10)
            if (x > 2)
              costs.set(x - 1, y, 10)

            if (y > 2)
              costs.set(x, y - 1, 10)

            if (x > 2 && y > 2)
              costs.set(x - 1, y - 1, 10)
          }
        }
      }
      /* 第二层设置墙壁 */
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          if (terrian.get(x, y) === TERRAIN_MASK_WALL) {
            costs.set(x, y, 0xFF)
            if (x > 2)
              costs.set(x - 1, y, 0xFF)

            if (y > 2)
              costs.set(x, y - 1, 0xFF)

            if (x > 2 && y > 2)
              costs.set(x - 1, y - 1, 0xFF)
          }
        }
      }
      if (!room_) {
        /* 没有视野就不访问其他内容 */
        return costs
      }
      // 将其他地图中的道路设置为1，无法行走的建筑设置为255
      room_.find(FIND_STRUCTURES).forEach((struct) => {
        if (struct.structureType !== STRUCTURE_CONTAINER && struct.structureType !== STRUCTURE_ROAD
                    && (struct.structureType !== STRUCTURE_RAMPART || !struct.my)) {
          costs.set(struct.pos.x, struct.pos.y, 0xFF)
          costs.set(struct.pos.x - 1, struct.pos.y, 0xFF)
          costs.set(struct.pos.x, struct.pos.y - 1, 0xFF)
          costs.set(struct.pos.x - 1, struct.pos.y - 1, 0xFF)
        }
      })
      /* 防止撞到其他虫子造成堵虫 */
      room_.find(FIND_CREEPS).forEach((creep) => {
        /* 是要不是四人小队的爬都设置成255 */
        if (!Object.keys(squadData).includes(creep.name)) {
          costs.set(creep.pos.x, creep.pos.y, 255)
          costs.set(creep.pos.x - 1, creep.pos.y, 255)
          costs.set(creep.pos.x, creep.pos.y - 1, 255)
          costs.set(creep.pos.x - 1, creep.pos.y - 1, 255)
        }
      })
      return costs
    },
  })
  /* 获取移动方向 */
  const direction = standPos.getDirectionTo(result.path[0])
  if (!direction)
    return
  for (const c in squadData) {
    if (Game.creeps[c]) {
      /* 如果有疲劳单位，就停止 */
      if (Game.creeps[c].fatigue)
        return
      /* 如果没有腿子,就停止 */
      if (Game.creeps[c].getActiveBodyparts('move') <= 0)
        return
      if (!isSquadReady(squadData))
        return
      /* 如果检测到要移动的方向是墙壁，就停止 */
      if (result.path[0].x <= 48 && result.path[0].y <= 48) {
        const nextPostion = new RoomPosition(result.path[0].x + SquadPos[squadData[c].position][0], result.path[0].y + SquadPos[squadData[c].position][1], result.path[0].roomName)
        if (nextPostion) {
          if (nextPostion.lookFor(LOOK_TERRAIN)[0] === 'wall') {
            Game.creeps[c].say('❗')
            return
          }
        }
      }
    }
  }
  for (const c in squadData) {
    if (Game.creeps[c])
      Game.creeps[c].move(direction)
  }
}

/* 判定小队是否已经接近目标了 */
export function squadNear(squadData: Squad, disPos: RoomPosition): boolean {
  for (const i in squadData) {
    if (Game.creeps[i] && Game.creeps[i].pos.isNearTo(disPos))
      return true
  }
  return false
}

/* 判定小队完全贴近目标的个数 0 1 2    0代表与目标无接触 1代表与目标斜对线接触 2代表完全接触 */
export function squadNearNum(squadData: Squad, disPos: RoomPosition): number {
  let num = 0
  for (const i in squadData) {
    if (Game.creeps[i] && Game.creeps[i].pos.isNearTo(disPos))
      num += 1
  }
  return num
}
