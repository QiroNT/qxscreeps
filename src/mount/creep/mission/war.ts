import { findFollowQuarter, findNextQuarter, havePart, identifyGarrison, isRoomInRange, isRoomNextTo } from '@/module/fun/funtion'
import { RangeClosestCreep, RangeCreep, canSustain, pathClosestFlag, pathClosestStructure, warDataInit } from '@/module/war/war'
import { generateID, getDistance, isInArray } from '@/utils'

export default class CreepMissionWarExtension extends Creep {
  // 黄球拆迁
  public handle_dismantle(): void {
    const missionData = this.memory.missionData
    const id = missionData.id
    const data = missionData.Data
    if (data.boost) {
      if (!this.BoostCheck(['move', 'work']))
        return
    }
    if (this.room.name != data.disRoom || data.shard != Game.shard.name) {
      this.arriveTo(new RoomPosition(25, 25, data.disRoom), 20, data.shard, data.shardData ? data.shardData : null)
      return
    }
    // 对方开安全模式情况下 删除任务
    if (this.room.controller && this.room.controller.safeMode) {
      if (Game.shard.name == this.memory.shard)
        Game.rooms[this.memory.belong].removeMission(id)

      return
    }
    /* dismantle_0 */
    const disFlag = this.pos.findClosestByPath(FIND_FLAGS, {
      filter: (flag) => {
        return flag.name.indexOf('dismantle') == 0
      },
    })
    if (!disFlag) {
      const clostStructure = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
        filter: (struc) => {
          return !isInArray([STRUCTURE_CONTROLLER, STRUCTURE_WALL], struc.structureType)
        },
      })
      if (clostStructure) {
        clostStructure.pos.createFlag(`${generateID()}`, COLOR_WHITE)
        return
      }
      else { return }
    }
    const stru = disFlag.pos.lookFor(LOOK_STRUCTURES)[0]
    if (stru) {
      if (this.dismantle(stru) == ERR_NOT_IN_RANGE)
        this.goTo(stru.pos, 1)
    }
    else { disFlag.remove() }
  }

  // 控制攻击
  public handle_control(): void {
    const missionData = this.memory.missionData
    const id = missionData.id
    const data = missionData.Data
    if (this.room.name != data.disRoom || Game.shard.name != data.shard) {
      this.arriveTo(new RoomPosition(24, 24, data.disRoom), 23, data.shard, data.shardData ? data.shardData : null)
    }
    else {
      // 对方开安全模式情况下 删除任务
      if (this.room.controller && this.room.controller.safeMode) {
        if (Game.shard.name == this.memory.shard)
          Game.rooms[this.memory.belong].removeMission(id)

        return
      }
      const control = this.room.controller
      if (!this.pos.isNearTo(control)) { this.goTo(control.pos, 1) }
      else {
        if (control.owner)
          this.attackController(control)
        else this.reserveController(control)
      }
    }
  }

  // 红球防御
  public handle_defend_attack(): void {
    if (!this.BoostCheck(['move', 'attack']))
      return
    this.memory.standed = true
    if (this.hitsMax - this.hits > 200)
      this.optTower('heal', this)
    this.memory.crossLevel = 16
    /* 如果周围1格发现敌人，爬虫联合防御塔攻击 */
    const nearCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
      filter: (creep) => {
        return !isInArray(Memory.whitelist, creep.name)
      },
    })
    if (nearCreep.length > 0) {
      this.attack(nearCreep[0])
      this.optTower('attack', nearCreep[0])
    }
    /* 寻路去距离敌对爬虫最近的rampart */
    const hostileCreep = Game.rooms[this.memory.belong].find(FIND_HOSTILE_CREEPS, {
      filter: (creep) => {
        return !isInArray(Memory.whitelist, creep.name)
      },
    })
    if (hostileCreep.length > 0) {
      for (const c of hostileCreep)
      /* 如果发现Hits/hitsMax低于百分之80的爬虫，直接防御塔攻击 */
      {
        if (c.hits / c.hitsMax <= 0.8)
          this.optTower('attack', c)
      }
    }
    else { return }
    // 以gather_attack开头的旗帜  例如： defend_attack_0 优先前往该旗帜附近
    const gatherFlag = this.pos.findClosestByPath(FIND_FLAGS, {
      filter: (flag) => {
        return flag.name.indexOf('defend_attack') == 0
      },
    })
    if (gatherFlag) {
      this.goTo(gatherFlag.pos, 0)
      return
    }
    if (!Game.rooms[this.memory.belong].memory.enemy[this.name])
      Game.rooms[this.memory.belong].memory.enemy[this.name] = []
    if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0) {
      /* 领取敌对爬虫 */
      const creeps_ = []
      for (var creep of hostileCreep) {
        /* 判断一下该爬虫的id是否存在于其他爬虫的分配里了 */
        if (this.isInDefend(creep))
          continue
        else
          creeps_.push(creep)
      }
      if (creeps_.length > 0) {
        let highestAim: Creep = creeps_[0]
        for (const i of creeps_) {
          if (havePart(i, 'attack') || havePart(i, 'work')) {
            highestAim = i
            break
          }
        }
        Game.rooms[this.memory.belong].memory.enemy[this.name].push(highestAim.id)
        /* 方便识别小队，把周围的爬也放进去 【如果本来不是小队但暂时在周围的，后续爬虫会自动更新】 */
        const nearHCreep = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
          filter: (creep) => {
            return !isInArray(Memory.whitelist, creep.name) && !this.isInDefend(creep)
          },
        })
        if (nearHCreep.length > 0)
          for (const n of nearHCreep) Game.rooms[this.memory.belong].memory.enemy[this.name].push(n.id)
      }
    }
    else {
      const en = Game.getObjectById(Game.rooms[this.memory.belong].memory.enemy[this.name][0]) as Creep
      if (!en) {
        Game.rooms[this.memory.belong].memory.enemy[this.name].splice(0, 1)
        return
      }
      let nstC = en
      // 查找是否是小队爬, 发现不是小队爬就删除
      if (Game.rooms[this.memory.belong].memory.enemy[this.name].length > 1) {
        B:
        for (const id of Game.rooms[this.memory.belong].memory.enemy[this.name]) {
          const idCreep = Game.getObjectById(id) as Creep
          if (!idCreep)
            continue B
          if (Game.time % 10 == 0) // 防止敌方爬虫bug
          {
            if (Math.abs(idCreep.pos.x - en.pos.x) >= 2 || Math.abs(idCreep.pos.y - en.pos.y) >= 2) {
              const index = Game.rooms[this.memory.belong].memory.enemy[this.name].indexOf(id)
              Game.rooms[this.memory.belong].memory.enemy[this.name].splice(index, 1)
              continue B
            }
          }
          if (getDistance(this.pos, idCreep.pos) < getDistance(this.pos, nstC.pos))
            nstC = idCreep
        }
      }
      if (nstC) {
        // 寻找最近的爬距离最近的rampart,去那里呆着
        var nearstram = nstC.pos.findClosestByRange(FIND_MY_STRUCTURES, {
          filter: (stru) => {
            return stru.structureType == 'rampart' && stru.pos.getStructureList(['extension', 'link', 'observer', 'tower', 'controller', 'extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 || stru.pos.lookFor(LOOK_CREEPS)[0] == this)
          },
        })
        if (nearstram)
          this.goTo_defend(nearstram.pos, 0)
        else this.moveTo(nstC.pos)
      }
    }
    // 仍然没有说明主动防御已经饱和
    if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0) {
      this.say('🔍')
      const closestCreep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: (creep) => {
          return !isInArray(Memory.whitelist, creep.name)
        },
      })
      if (closestCreep && !this.pos.inRangeTo(closestCreep.pos, 3)) {
        /* 找离虫子最近的rampart */
        var nearstram = closestCreep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
          filter: (stru) => {
            return stru.structureType == 'rampart' && stru.pos.getStructureList(['extension', 'link', 'observer', 'tower', 'controller', 'extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 || stru.pos.lookFor(LOOK_CREEPS)[0] == this)
          },
        })
        this.goTo_defend(nearstram.pos, 0)
      }
    }
    if (this.pos.x >= 48 || this.pos.x <= 1 || this.pos.y >= 48 || this.pos.y <= 1)
      this.moveTo(new RoomPosition(Memory.roomControlData[this.memory.belong].center[0], Memory.roomControlData[this.memory.belong].center[1], this.memory.belong))
  }

  // 蓝球防御
  public handle_defend_range(): void {
    if (!this.BoostCheck(['move', 'ranged_attack']))
      return
    this.memory.crossLevel = 15
    if (this.hitsMax - this.hits > 200)
      this.optTower('heal', this)
    /* 如果周围1格发现敌人，爬虫联合防御塔攻击 */
    const nearCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
      filter: (creep) => {
        return !isInArray(Memory.whitelist, creep.name)
      },
    })
    if (nearCreep.length > 0) {
      const nearstCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
        filter: (creep) => {
          return !isInArray(Memory.whitelist, creep.name)
        },
      })
      if (nearstCreep.length > 0)
        this.rangedMassAttack()
      else this.rangedAttack(nearCreep[0])
      if (Game.time % 4 == 0)
        this.optTower('attack', nearCreep[0])
    }
    /* 寻路去距离敌对爬虫最近的rampart */
    const hostileCreep = Game.rooms[this.memory.belong].find(FIND_HOSTILE_CREEPS, {
      filter: (creep) => {
        return !isInArray(Memory.whitelist, creep.name)
      },
    })
    if (hostileCreep.length > 0) {
      for (const c of hostileCreep)
      /* 如果发现Hits/hitsMax低于百分之80的爬虫，直接防御塔攻击 */
      {
        if (c.hits / c.hitsMax <= 0.8)
          this.optTower('attack', c)
      }
    }
    // 以gather_attack开头的旗帜  例如： defend_range_0 优先前往该旗帜附近
    const gatherFlag = this.pos.findClosestByPath(FIND_FLAGS, {
      filter: (flag) => {
        return flag.name.indexOf('defend_range') == 0
      },
    })
    if (gatherFlag) {
      this.goTo(gatherFlag.pos, 0)
      return
    }
    if (!Game.rooms[this.memory.belong].memory.enemy[this.name])
      Game.rooms[this.memory.belong].memory.enemy[this.name] = []
    if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0) {
      /* 领取敌对爬虫 */
      const creeps_ = []
      for (var creep of hostileCreep) {
        /* 判断一下该爬虫的id是否存在于其他爬虫的分配里了 */
        if (this.isInDefend(creep))
          continue
        else
          creeps_.push(creep)
      }
      if (creeps_.length > 0) {
        let highestAim: Creep = creeps_[0]
        for (const i of creeps_) {
          if (havePart(i, 'ranged_attack')) {
            highestAim = i
            break
          }
        }
        Game.rooms[this.memory.belong].memory.enemy[this.name].push(highestAim.id)
        /* 方便识别小队，把周围的爬也放进去 【如果本来不是小队但暂时在周围的，后续爬虫会自动更新】 */
        const nearHCreep = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
          filter: (creep) => {
            return !isInArray(Memory.whitelist, creep.name) && !this.isInDefend(creep)
          },
        })
        if (nearHCreep.length > 0)
          for (const n of nearHCreep) Game.rooms[this.memory.belong].memory.enemy[this.name].push(n.id)
      }
    }
    else {
      const en = Game.getObjectById(Game.rooms[this.memory.belong].memory.enemy[this.name][0]) as Creep
      if (!en) {
        Game.rooms[this.memory.belong].memory.enemy[this.name].splice(0, 1)
        return
      }
      let nstC = en
      // 查找是否是小队爬, 发现不是小队爬就删除
      if (Game.rooms[this.memory.belong].memory.enemy[this.name].length > 1) {
        B:
        for (const id of Game.rooms[this.memory.belong].memory.enemy[this.name]) {
          const idCreep = Game.getObjectById(id) as Creep
          if (!idCreep)
            continue B
          if (Game.time % 10 == 0) {
            if (Math.abs(idCreep.pos.x - en.pos.x) >= 2 || Math.abs(idCreep.pos.y - en.pos.y) >= 2) {
              const index = Game.rooms[this.memory.belong].memory.enemy[this.name].indexOf(id)
              Game.rooms[this.memory.belong].memory.enemy[this.name].splice(index, 1)
              continue B
            }
          }
          if (getDistance(this.pos, idCreep.pos) < getDistance(this.pos, nstC.pos))
            nstC = idCreep
        }
      }
      if (nstC) {
        // 寻找最近的爬距离最近的rampart,去那里呆着
        var nearstram = nstC.pos.findClosestByRange(FIND_MY_STRUCTURES, {
          filter: (stru) => {
            return stru.structureType == 'rampart' && stru.pos.getStructureList(['extension', 'link', 'observer', 'tower', 'controller', 'extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 || stru.pos.lookFor(LOOK_CREEPS)[0] == this)
          },
        })
        if (nearstram)
          this.goTo_defend(nearstram.pos, 0)
        else this.moveTo(nstC.pos)
      }
    }
    // 仍然没有说明主动防御已经饱和
    if (Game.rooms[this.memory.belong].memory.enemy[this.name].length <= 0) {
      this.say('🔍')
      const closestCreep = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: (creep) => {
          return !isInArray(Memory.whitelist, creep.name)
        },
      })
      if (closestCreep && !this.pos.inRangeTo(closestCreep.pos, 3)) {
        /* 找离虫子最近的rampart */
        var nearstram = closestCreep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
          filter: (stru) => {
            return stru.structureType == 'rampart' && stru.pos.getStructureList(['extension', 'link', 'observer', 'tower', 'controller', 'extractor']).length <= 0 && (stru.pos.lookFor(LOOK_CREEPS).length <= 0 || stru.pos.lookFor(LOOK_CREEPS)[0] == this)
          },
        })
        this.goTo_defend(nearstram.pos, 0)
      }
    }
    if (this.pos.x >= 48 || this.pos.x <= 1 || this.pos.y >= 48 || this.pos.y <= 1)
      this.moveTo(new RoomPosition(Memory.roomControlData[this.memory.belong].center[0], Memory.roomControlData[this.memory.belong].center[1], this.memory.belong))
  }

  // 双人防御
  public handle_defend_double(): void {
    if (this.memory.role == 'defend-douAttack') {
      if (!this.BoostCheck(['move', 'attack', 'tough']))
        return
    }
    else {
      if (!this.BoostCheck(['move', 'heal', 'tough']))
        return
    }
    if (!this.memory.double) {
      if (this.memory.role == 'defend-douHeal') {
        /* 由heal来进行组队 */
        if (Game.time % 7 == 0) {
          const disCreep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
            filter: (creep) => {
              return creep.memory.role == 'defend-douAttack' && !creep.memory.double
            },
          })
          if (disCreep) {
            this.memory.double = disCreep.name
            disCreep.memory.double = this.name
            this.memory.captain = false
            disCreep.memory.captain = true
          }
        }
      }
      return
    }
    if (this.memory.role == 'defend-douAttack') {
      if (this.hitsMax - this.hits > 1200)
        this.optTower('heal', this)
      if (!Game.creeps[this.memory.double])
        return
      if (this.fatigue || Game.creeps[this.memory.double].fatigue)
        return
      if (Game.creeps[this.memory.double] && !this.pos.isNearTo(Game.creeps[this.memory.double]) && (!isInArray([0, 49], this.pos.x) && !isInArray([0, 49], this.pos.y)))
        return
        /* 去目标房间 */
      if (this.room.name != this.memory.belong) {
        this.goTo(new RoomPosition(24, 24, this.memory.belong), 23)
      }
      else {
        const flag = this.pos.findClosestByPath(FIND_FLAGS, {
          filter: (flag) => {
            return flag.name.indexOf('defend_double') == 0
          },
        })
        if (flag) {
          const creeps = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
            filter: (creep) => {
              return !isInArray(Memory.whitelist, creep.owner.username)
            },
          })
          if (creeps[0])
            this.attack(creeps[0])
          this.goTo(flag.pos, 0)
          return
        }
        const creeps = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
          filter: (creep) => {
            return !isInArray(Memory.whitelist, creep.owner.username)
          },
        })
        if (creeps && !isInArray([0, 49], creeps.pos.x) && !isInArray([0, 49], creeps.pos.y)) {
          if (this.attack(creeps) == ERR_NOT_IN_RANGE)
            this.goTo(creeps.pos, 1)
        }
        if (this.pos.x >= 48 || this.pos.x <= 1 || this.pos.y >= 48 || this.pos.y <= 1)
          this.moveTo(new RoomPosition(Memory.roomControlData[this.memory.belong].center[0], Memory.roomControlData[this.memory.belong].center[1], this.memory.belong))
      }
    }
    else {
      if (this.hitsMax - this.hits > 600)
        this.optTower('heal', this)
      this.moveTo(Game.creeps[this.memory.double])
      if (Game.creeps[this.memory.double])
        this.heal(Game.creeps[this.memory.double])
      else this.heal(this)
      if (!Game.creeps[this.memory.double]) { this.suicide() }
      else {
        if (this.pos.isNearTo(Game.creeps[this.memory.double])) {
          const caption_hp = Game.creeps[this.memory.double].hits
          const this_hp = this.hits
          if (this_hp == this.hitsMax && caption_hp == Game.creeps[this.memory.double].hitsMax)
            this.heal(Game.creeps[this.memory.double])
          if (caption_hp < this_hp)
            this.heal(Game.creeps[this.memory.double])

          else
            this.heal(this)

          const otherCreeps = this.pos.findInRange(FIND_MY_CREEPS, 3, { filter: (creep) => { return creep.hits < creep.hitsMax - 300 } })
          if (otherCreeps[0] && this.hits == this.hitsMax && Game.creeps[this.memory.double].hits == Game.creeps[this.memory.double].hitsMax) {
            if (otherCreeps[0].pos.isNearTo(this))
              this.heal(otherCreeps[0])
            else this.rangedHeal(otherCreeps[0])
          }
        }
        else {
          this.heal(this)
          this.moveTo(Game.creeps[this.memory.double])
        }
      }
    }
  }

  // 攻防一体 已经做一定测试 目前未发现bug
  public handle_aio(): void {
    const missionData = this.memory.missionData
    const id = missionData.id
    const data = missionData.Data
    if (!missionData)
      return
    if (this.room.name == this.memory.belong && Game.shard.name == this.memory.shard) {
      if (data.boost && !this.BoostCheck(['move', 'heal', 'tough', 'ranged_attack']))
        return
    }
    if ((this.room.name != data.disRoom || Game.shard.name != data.shard)) {
      this.heal(this)
      this.arriveTo(new RoomPosition(24, 24, data.disRoom), 23, data.shard, data.shardData ? data.shardData : null)
    }
    else {
      // 对方开安全模式情况下 删除任务
      if (this.room.controller && this.room.controller.safeMode) {
        if (Game.shard.name == this.memory.shard)
          Game.rooms[this.memory.belong].removeMission(id)

        return
      }
      warDataInit(Game.rooms[data.disRoom])
      const creeps = global.warData.enemy[data.disRoom].data
      const flags = global.warData.flag[data.disRoom].data
      if (!this.memory.targetFlag) // 没有目标旗帜Memory的情况下，先查找有没有最近的周围没有攻击爬的旗帜
      {
        this.heal(this)
        const flag_attack = pathClosestFlag(this.pos, flags, 'aio', true, 4) // 最近的攻击旗帜
        if (flag_attack) {
          this.memory.targetFlag = flag_attack.name
        }
        else {
          // 没有旗帜，就寻找一个最近的非危险建筑【优先没有rampart的】
          const safeStructure = pathClosestStructure(this.pos, true, true, true, 4)
          if (!safeStructure) {
            // 还没有就寻找ram
            const ramStructure = pathClosestStructure(this.pos, true, false, true, 4)
            if (!ramStructure) {
              const wallStructure = pathClosestStructure(this.pos, false, false, true, 2)
              if (!wallStructure) {
              }
              else {
                const randomStr = Math.random().toString(36).substr(3)
                if (!Game.flags[`aio_${randomStr}`])
                  wallStructure.pos.createFlag(`aio_${randomStr}`)
                this.memory.targetFlag = `aio_${randomStr}`
              }
            }
            else {
              const randomStr = Math.random().toString(36).substr(3)
              if (!Game.flags[`aio_${randomStr}`])
                ramStructure.pos.createFlag(`aio_${randomStr}`)
              this.memory.targetFlag = `aio_${randomStr}`
            }
          }
          else {
            const randomStr = Math.random().toString(36).substr(3)
            if (!Game.flags[`aio_${randomStr}`]) {
              safeStructure.pos.createFlag(`aio_${randomStr}`)
              this.memory.targetFlag = `aio_${randomStr}`
            }
          }
        }
        // 遇到不能承受的爬就规避
        const ranged3Attack = RangeCreep(this.pos, creeps, 3, true) // 三格内的攻击性爬虫
        if (ranged3Attack.length > 0) {
          this.say('危')
          // 防御塔伤害数据
          const towerData = global.warData.tower[this.room.name].data
          const posStr = `${this.pos.x}/${this.pos.y}`
          const towerHurt = towerData[posStr] ? towerData[posStr].attack : 0
          if (!canSustain(ranged3Attack, this, towerHurt)) {
            const closestHurtCreep = RangeClosestCreep(this.pos, ranged3Attack, true)
            if (closestHurtCreep)
              this.Flee(closestHurtCreep.pos, 3)
          }
        }
      }
      else {
        if (!Game.flags[this.memory.targetFlag]) {
          delete this.memory.targetFlag
        }
        else {
          const pos_ = Game.flags[this.memory.targetFlag].pos
          if (pos_.roomName != this.room.name) {
            delete this.memory.targetFlag
            return
          }
          const stru = pos_.lookFor(LOOK_STRUCTURES)
          if (stru.length <= 0 || (stru[0].structureType == 'road' || stru[0].structureType == 'container') && stru.length == 1) {
            this.heal(this)
            Game.flags[this.memory.targetFlag].remove()
            delete this.memory.targetFlag
            // 尝试看一下有没有建筑 对墙就不做尝试了
            const safeStructure = pathClosestStructure(this.pos, true, true, true, 4)
            if (safeStructure) {
              const randomStr = Math.random().toString(36).substr(3)
              if (!Game.flags[`aio_${randomStr}`]) {
                safeStructure.pos.createFlag(`aio_${randomStr}`)
                this.memory.targetFlag = `aio_${randomStr}`
              }
              return
            }
          }
          else {
            // 自动规避
            const ranged3Attack = RangeCreep(this.pos, creeps, 3, true) // 三格内的攻击性爬虫
            if (ranged3Attack.length > 0) {
              this.say('危')
              // 防御塔伤害数据
              const towerData = global.warData.tower[this.room.name].data
              const posStr = `${this.pos.x}/${this.pos.y}`
              const towerHurt = towerData[posStr] ? towerData[posStr].attack : 0
              if (!canSustain(ranged3Attack, this, towerHurt)) {
                /* 删除记忆 */
                if (!this.pos.isNearTo(Game.flags[this.memory.targetFlag]))
                  delete this.memory.targetFlag

                this.heal(this)
                const closestHurtCreep = RangeClosestCreep(this.pos, ranged3Attack, true)
                if (closestHurtCreep)
                  this.Flee(closestHurtCreep.pos, 3)
              }
              else {
                if (!this.pos.isNearTo(pos_))
                  this.goTo_aio(pos_, 1)
              }
            }
            else {
              if (!this.pos.isNearTo(pos_))
                this.goTo_aio(pos_, 1)
            }
            // 根据建筑类型判断攻击方式
            if (isInArray([STRUCTURE_WALL, STRUCTURE_ROAD, STRUCTURE_CONTAINER], stru[0].structureType)) {
              this.rangedAttack(stru[0])
            }
            else {
              if (stru[0].pos.isNearTo(this))
                this.rangedMassAttack()

              else
                this.rangedAttack(stru[0])
            }
          }
        }
      }
      const ranged3ramcreep = RangeCreep(this.pos, creeps, 3, false, true)
      // 自动攻击爬虫
      if (ranged3ramcreep.length > 0) {
        if (this.pos.isNearTo(ranged3ramcreep[0]))
          this.rangedMassAttack()

        else
          this.rangedAttack(ranged3ramcreep[0])
      }
      // 治疗自己和周围友军
      if (this.hits < this.hitsMax) { this.heal(this) }
      else {
        const allys = this.pos.findInRange(FIND_CREEPS, 3, {
          filter: (creep) => {
            return (creep.my || isInArray(Memory.whitelist, creep.owner.username)) && creep.hitsMax - creep.hits > 350
          },
        })
        if (allys.length > 0) {
          // 寻找最近的爬
          let ally_ = allys[0]
          for (const i of allys) {
            if (getDistance(this.pos, i.pos) < getDistance(ally_.pos, this.pos))
              ally_ = i
          }
          if (this.pos.isNearTo(ally_))
            this.heal(ally_)
          else this.rangedHeal(ally_)
        }
        else { this.heal(this) }
      }
    }
  }

  // 四人小队 已经测试 多次跨shard未测试
  public handle_task_squard(): void {
    const data = this.memory.missionData.Data
    const shard = data.shard // 目标shard
    const roomName = data.disRoom // 目标房间名
    const squadID = data.squadID // 四人小队id
    /* controlledBySquadFrame为true代表不再受任务控制，改为战斗模块控制 */
    if (this.memory.controlledBySquardFrame) {
      /* 说明到达指定房间，并到达合适位置了 */
      /* 添加战争框架控制信息 */
      if (!Memory.squadMemory)
        Memory.squadMemory = {}
      if (!squadID) { this.say('找不到squardID!'); return }
      if (!Memory.squadMemory[squadID]) {
        Memory.squadMemory[squadID] = {
          creepData: this.memory.squad,
          sourceRoom: this.memory.belong,
          presentRoom: this.room.name,
          disRoom: data.disRoom,
          ready: false,
          array: 'free',
          sourceShard: this.memory.shard,
          disShard: this.memory.targetShard,
          squardType: data.flag,
        }
      }
    }
    else {
      /* 任务开始前准备 */
      if (this.room.name == this.memory.belong && this.memory.shard == Game.shard.name) {
        const thisRoom = Game.rooms[this.memory.belong]
        /* boost检查 */
        if (this.getActiveBodyparts('move') > 0) {
          if (!this.BoostCheck([, 'move']))
            return
        }
        if (this.getActiveBodyparts('heal') > 0) {
          if (!this.BoostCheck([, 'heal']))
            return
        }
        if (this.getActiveBodyparts('work') > 0) {
          if (!this.BoostCheck([, 'work']))
            return
        }
        if (this.getActiveBodyparts('attack') > 0) {
          if (!this.BoostCheck([, 'attack']))
            return
        }
        if (this.getActiveBodyparts('ranged_attack') > 0) {
          if (!this.BoostCheck([, 'ranged_attack']))
            return
        }
        if (this.getActiveBodyparts('tough') > 0) {
          if (!this.BoostCheck([, 'tough']))
            return
        }
        /* 组队检查 */
        if (!squadID)
          return
        if (!this.memory.missionData.id)
          return
        if (!thisRoom.memory.squadData)
          Game.rooms[this.memory.belong].memory.squadData = {}
        const MissionSquardData = thisRoom.memory.squadData[squadID]
        if (!MissionSquardData)
          thisRoom.memory.squadData[squadID] = {}
        /* 编队信息初始化 */
        if (this.memory.creepType == 'heal' && !this.memory.squad) {
          if (this.memory.role == 'x-aio') {
            if (Object.keys(MissionSquardData).length <= 0)
              MissionSquardData[this.name] = { position: '↙', index: 1, role: this.memory.role, creepType: this.memory.creepType }
            if (Object.keys(MissionSquardData).length == 1 && !isInArray(Object.keys(MissionSquardData), this.name))
              MissionSquardData[this.name] = { position: '↖', index: 0, role: this.memory.role, creepType: this.memory.creepType }
            if (Object.keys(MissionSquardData).length == 2 && !isInArray(Object.keys(MissionSquardData), this.name))
              MissionSquardData[this.name] = { position: '↘', index: 3, role: this.memory.role, creepType: this.memory.creepType }
            if (Object.keys(MissionSquardData).length == 3 && !isInArray(Object.keys(MissionSquardData), this.name))
              MissionSquardData[this.name] = { position: '↗', index: 2, role: this.memory.role, creepType: this.memory.creepType }
          }
          else {
            if (Object.keys(MissionSquardData).length <= 0)
              MissionSquardData[this.name] = { position: '↙', index: 1, role: this.memory.role, creepType: this.memory.creepType }
            if (Object.keys(MissionSquardData).length == 2 && !isInArray(Object.keys(MissionSquardData), this.name))
              MissionSquardData[this.name] = { position: '↘', index: 3, role: this.memory.role, creepType: this.memory.creepType }
          }
        }
        else if (this.memory.creepType == 'attack' && !this.memory.squad) {
          if (Object.keys(MissionSquardData).length == 1 && !isInArray(Object.keys(MissionSquardData), this.name))
            MissionSquardData[this.name] = { position: '↖', index: 0, role: this.memory.role, creepType: this.memory.creepType }
          if (Object.keys(MissionSquardData).length == 3 && !isInArray(Object.keys(MissionSquardData), this.name))
            MissionSquardData[this.name] = { position: '↗', index: 2, role: this.memory.role, creepType: this.memory.creepType }
        }
        if (Object.keys(thisRoom.memory.squadData[squadID]).length == 4 && !this.memory.squad) {
          console.log(`[squad] 房间${this.memory.belong}ID为:${squadID}的四人小队数量已经到位!将从房间分发组队数据!`)
          this.memory.squad = thisRoom.memory.squadData[squadID]
          return
        }
        /* 检查是否所有爬虫都赋予记忆了 */
        if (!this.memory.squad)
          return
        for (const mem in this.memory.squad) {
          if (!Game.creeps[mem])
            return
          if (!Game.creeps[mem].memory.squad)
            return
        }
        /* 爬虫都被赋予了组队数据了，就删除房间内的原始数据 */
        if (thisRoom.memory.squadData[squadID])
          delete thisRoom.memory.squadData[squadID]
      }
      /* 在到达任务房间的隔壁房间前，默认攻击附近爬虫 */
      if (this.getActiveBodyparts('ranged_attack')) {
        const enemy = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
          filter: (creep) => {
            return !isInArray(Memory.whitelist, creep.owner.username)
          },
        })
        if (enemy.length > 0) {
          for (const enemy_ of enemy) {
            if (enemy_.pos.isNearTo(this))
              this.rangedMassAttack()
          }
          this.rangedAttack(enemy[0])
        }
      }
      /* 在到达任务房间的隔壁房间前，默认治疗附近爬虫 */
      if (this.getActiveBodyparts('heal')) {
        let bol = true
        for (const i in this.memory.squad) {
          if (Game.creeps[i] && Game.creeps[i].hits < Game.creeps[i].hitsMax && this.pos.isNearTo(Game.creeps[i])) {
            bol = false
            this.heal(Game.creeps[i])
          }
        }
        if (bol)
          this.heal(this)
      }
      /* 线性队列行走规则: 有成员疲劳就停止行走 */
      for (const cc in this.memory.squad) {
        if (Game.creeps[cc] && Game.creeps[cc].fatigue)
          return
      }
      /* 编号为 0 1 2 的爬需要遵守的规则 */
      if (this.memory.squad[this.name].index != 3 && (!isInArray([0, 49], this.pos.x) && !isInArray([0, 49], this.pos.y))) {
        const followCreepName = findNextQuarter(this)
        if (followCreepName == null)
          return
        var portal = this.pos.findClosestByRange(FIND_STRUCTURES, {
          filter: (stru) => {
            return stru.structureType == 'portal'
          },
        })
        const followCreep = Game.creeps[followCreepName]
        if (!followCreep && portal)
          return
        if (followCreep) {
          // 跟随爬不靠在一起就等一等
          if (!this.pos.isNearTo(followCreep))
            return
        }
      }
      /* 编号为 1 2 3 的爬需要遵守的规则 */
      if (this.memory.squad[this.name].index != 0) {
        const disCreepName = findFollowQuarter(this)
        var portal = this.pos.findClosestByRange(FIND_STRUCTURES, {
          filter: (stru) => {
            return stru.structureType == 'portal'
          },
        })
        // 跨shard信息更新 可以防止一些可能出现的bug
        if (portal && data.shardData)
          this.updateShardAffirm()

        if (disCreepName == null || (!Game.creeps[disCreepName] && !portal))
          return
        if (!Game.creeps[disCreepName] && portal) { this.arriveTo(new RoomPosition(24, 24, roomName), 20, shard, data.shardData ? data.shardData : null); return }
        if (Game.shard.name == shard && !Game.creeps[disCreepName])
          return
        const disCreep = Game.creeps[disCreepName]
        if (this.room.name == this.memory.belong)
          this.goTo(disCreep.pos, 0)
        else this.moveTo(disCreep)
        return
      }
      // 接下来在门口自动组队
      if (this.memory.squad[this.name].index == 0) {
        /* 判断在不在目标房间入口房间 */
        if (Game.flags[`squad_unit_${this.memory.missionData.id}`]) {
          // 有集结旗帜的情况下，优先前往目标房间
          if (this.room.name != Game.flags[`squad_unit_${this.memory.missionData.id}`].pos.roomName || Game.shard.name != data.shard) {
            if (this.memory.squad[this.name].index == 0)
              this.arriveTo(new RoomPosition(24, 24, roomName), 18, shard, data.shardData ? data.shardData : null)
            return
          }
        }
        else {
          // 没有集结旗帜的情况下，自动判断
          if (isRoomNextTo(this.room.name, roomName) == false || Game.shard.name != data.shard) {
            this.say('🔪')
            if (this.memory.squad[this.name].index == 0)
              this.arriveTo(new RoomPosition(24, 24, roomName), 18, shard, data.shardData ? data.shardData : null)
            return
          }
        }
        this.say('⚔️', true)
        if (!this.memory.arrived) {
          if (Game.flags[`squad_unit_${this.memory.missionData.id}`]) {
            // 有旗帜的情况下，如果到达旗帜附近，就判定arrived为true
            if (!this.pos.isEqualTo(Game.flags[`squad_unit_${this.memory.missionData.id}`]))
              this.goTo(Game.flags[`squad_unit_${this.memory.missionData.id}`].pos, 0)
            else
              this.memory.arrived = true
          }
          else {
            // 没有旗帜的情况下，到入口前5格组队
            if (isRoomInRange(this.pos, roomName, 5))
              this.memory.arrived = true

            else
              this.arriveTo(new RoomPosition(24, 24, roomName), 24, shard, data.shardData ? data.shardData : null)
          }
        }
        else {
          // 能组队就组队 否则就继续走
          if (identifyGarrison(this)) {
            for (const crp in this.memory.squad) {
              if (Game.creeps[crp])
                Game.creeps[crp].memory.controlledBySquardFrame = true
            }
          }
          else {
            this.arriveTo(new RoomPosition(24, 24, roomName), 24, shard, data.shardData ? data.shardData : null)
          }
        }
      }
    }
  }

  // 紧急支援 已经修改，但未作充分测试 可能有bug
  public handle_support(): void {
    const missionData = this.memory.missionData
    const id = missionData.id
    const data = missionData.Data
    if (!missionData)
      return
    const roomName = data.disRoom
    if (this.room.name == this.memory.belong && data.boost) {
      if (this.memory.role == 'double-attack') {
        if (!this.BoostCheck(['move', 'attack', 'tough']))
          return
      }
      else if (this.memory.role == 'double-heal') {
        if (!this.BoostCheck(['move', 'heal', 'ranged_attack', 'tough']))
          return
      }
      else if (this.memory.role == 'aio') {
        if (!this.BoostCheck(['move', 'heal', 'ranged_attack', 'tough']))
          return
      }
    }
    if (this.memory.role != 'aio' && !this.memory.double) {
      if (this.memory.role == 'double-heal') {
        /* 由heal来进行组队 */
        if (Game.time % 7 == 0) {
          const disCreep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
            filter: (creep) => {
              return creep.memory.role == 'double-attack' && !creep.memory.double
            },
          })
          if (disCreep) {
            this.memory.double = disCreep.name
            disCreep.memory.double = this.name
            this.memory.captain = false
            disCreep.memory.captain = true
          }
        }
      }
      return
    }
    if (this.memory.role == 'double-attack') {
      if (!Game.creeps[this.memory.double])
        return
      if (this.fatigue || Game.creeps[this.memory.double].fatigue)
        return
      if (Game.creeps[this.memory.double] && !this.pos.isNearTo(Game.creeps[this.memory.double]) && (!isInArray([0, 49], this.pos.x) && !isInArray([0, 49], this.pos.y)))
        return
      /* 去目标房间 */
      if (this.room.name != roomName || Game.shard.name != data.shard) {
        this.arriveTo(new RoomPosition(24, 24, roomName), 23, data.shard, data.shardData ? data.shardData : null)
      }
      else {
        const creeps = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
          filter: (creep) => {
            return !isInArray(Memory.whitelist, creep.owner.username)
          },
        })
        if (creeps) {
          if (this.attack(creeps) == ERR_NOT_IN_RANGE)
            this.goTo(creeps.pos, 1)
        }
        else {
          this.goTo(new RoomPosition(24, 24, data.disRoom), 10)
        }
        // 支援旗帜 support_double
        const flag = this.pos.findClosestByRange(FIND_FLAGS, {
          filter: (flag) => {
            return flag.name.indexOf('support_double') == 0
          },
        })
        if (flag) {
          const creeps = this.pos.findInRange(FIND_HOSTILE_CREEPS, 1, {
            filter: (creep) => {
              return !isInArray(Memory.whitelist, creep.owner.username)
            },
          })
          if (creeps[0])
            this.attack(creeps[0])
          this.goTo(flag.pos, 0)
          return
        }
        // 攻击建筑
        const attack_flag = this.pos.findClosestByPath(FIND_FLAGS, {
          filter: (flag) => {
            return flag.name.indexOf('support_double_attack') == 0
          },
        })
        if (attack_flag) {
          if (attack_flag.pos.lookFor(LOOK_STRUCTURES).length > 0) {
            if (this.attack(attack_flag.pos.lookFor(LOOK_STRUCTURES)[0]) == ERR_NOT_IN_RANGE)
              this.goTo(creeps.pos, 1)
          }
          else { attack_flag.remove() }
        }
      }
    }
    if (this.memory.role == 'double-heal') {
      const disCreepName = this.memory.double
      const portal = this.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (stru) => {
          return stru.structureType == 'portal'
        },
      })
      // 跨shard信息更新 可以防止一些可能出现的bug
      if (portal && data.shardData)
        this.updateShardAffirm()

      if (!Game.creeps[disCreepName] && portal) { this.arriveTo(new RoomPosition(25, 25, roomName), 20, data.shard, data.shardData ? data.shardData : null); return }
      if (Game.creeps[this.memory.double])
        this.moveTo(Game.creeps[this.memory.double])
      // 寻找敌人 远程攻击
      const enemy = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
        filter: (creep) => {
          return !isInArray(Memory.whitelist, creep.owner.username)
        },
      })
      if (enemy[0])
        this.rangedAttack(enemy[0])
      // 奶
      if (Game.creeps[this.memory.double]) {
        if (this.hits < this.hitsMax || Game.creeps[this.memory.double].hits < Game.creeps[this.memory.double].hitsMax) {
          if (this.hits < Game.creeps[this.memory.double].hits) { this.heal(this) }
          else {
            if (this.pos.isNearTo(Game.creeps[this.memory.double]))
              this.heal(Game.creeps[this.memory.double])
            else this.rangedHeal(Game.creeps[this.memory.double])
          }
          return
        }
      }
      // 默认治疗攻击爬，如果周围有友军，在自身血量满的情况下治疗友军
      const allys = this.pos.findInRange(FIND_CREEPS, 3, {
        filter: (creep) => {
          return (creep.my || isInArray(Memory.whitelist, creep.owner.username)) && creep.hitsMax - creep.hits > 350
        },
      })
      if (allys.length > 0) {
        // 寻找最近的爬
        let ally_ = allys[0]
        for (var i of allys) {
          if (getDistance(this.pos, i.pos) < getDistance(ally_.pos, this.pos))
            ally_ = i
        }
        if (this.pos.isNearTo(ally_))
          this.heal(ally_)
        else this.rangedHeal(ally_)
      }
      else {
        if (Game.creeps[this.memory.double])
          this.heal(Game.creeps[this.memory.double])
        else this.heal(this)
      }
    }
    if (this.memory.role == 'saio') {
      if (this.room.name != roomName || Game.shard.name != data.shard) {
        this.heal(this)
        this.arriveTo(new RoomPosition(24, 24, roomName), 23, data.shard, data.shardData ? data.shardData : null)
      }
      else {
        // 寻找敌人 远程攻击
        const enemy = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
          filter: (creep) => {
            return !isInArray(Memory.whitelist, creep.owner.username)
          },
        })
        let disenemy = null
        for (const e of enemy) {
          if (!e.pos.getStructure('rampart'))
            disenemy = e
        }
        if (disenemy) {
          if (this.pos.isNearTo(disenemy))
            this.rangedMassAttack()
          else if (this.pos.inRangeTo(disenemy, 3))
            this.rangedAttack(disenemy)
        }
        // 治疗自己和周围友军
        if (this.hits < this.hitsMax) { this.heal(this) }
        else {
          const allys = this.pos.findInRange(FIND_CREEPS, 3, {
            filter: (creep) => {
              return (creep.my || isInArray(Memory.whitelist, creep.owner.username)) && creep.hitsMax - creep.hits > 350
            },
          })
          if (allys.length > 0) {
            // 寻找最近的爬
            let ally_ = allys[0]
            for (var i of allys) {
              if (getDistance(this.pos, i.pos) < getDistance(ally_.pos, this.pos))
                ally_ = i
            }
            if (this.pos.isNearTo(ally_))
              this.heal(ally_)
            else this.rangedHeal(ally_)
          }
          else { this.heal(this) }
        }
        // 移动旗
        const move_flag = this.pos.findClosestByPath(FIND_FLAGS, {
          filter: (flag) => {
            return flag.name.indexOf('support_aio') == 0
          },
        })
        if (move_flag) {
          this.heal(this)
          this.goTo(move_flag.pos, 1)
          return
        }
        // 放风筝 计算自己奶量 敌对爬伤害
        if (enemy.length > 0 && !canSustain(enemy, this)) {
          // 放风筝 寻找最近的有攻击性的爬 离他远点
          const closestAttackCreep = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
            filter: (creep) => {
              return !isInArray(Memory.whitelist, creep.owner.username) && (creep.getActiveBodyparts('attack') > 0 || creep.getActiveBodyparts('ranged_attack') > 0)
            },
          })
          if (closestAttackCreep)
            this.Flee(closestAttackCreep.pos, 3)
          return
        }
        // 寻找最近的敌人攻击
        const closestCreep = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
          filter: (creep) => {
            return !isInArray(Memory.whitelist, creep.owner.username) && !creep.pos.getStructure('rampart')
          },
        })
        if (closestCreep && !this.pos.isNearTo(closestCreep))
          this.goTo(closestCreep.pos, 3)
      }
    }
  }

  // 双人小队 已测试 目前没有挂载战争信息模块和智能躲避
  public handle_double(): void {
    const missionData = this.memory.missionData
    const id = missionData.id
    const data = missionData.Data
    if (!missionData)
      return
    const roomName = data.disRoom
    if (this.room.name == this.memory.belong) {
      if (this.memory.role == 'double-attack') {
        if (!this.BoostCheck(['move', 'attack', 'tough']))
          return
      }
      else if (this.memory.role == 'double-heal') {
        if (!this.BoostCheck(['move', 'heal', 'ranged_attack', 'tough']))
          return
      }
      else if (this.memory.role == 'double-dismantle') {
        if (!this.BoostCheck(['move', 'work', 'tough']))
          return
      }
    }
    if (!this.memory.double) {
      if (this.memory.role == 'double-heal') {
        /* 由heal来进行组队 */
        if (Game.time % 7 == 0) {
          if (data.teamType == 'attack') {
            var disCreep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
              filter: (creep) => {
                return creep.memory.role == 'double-attack' && !creep.memory.double
              },
            })
          }
          else if (data.teamType == 'dismantle') {
            var disCreep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
              filter: (creep) => {
                return creep.memory.role == 'double-dismantle' && !creep.memory.double
              },
            })
          }
          else { return }
          if (disCreep) {
            this.memory.double = disCreep.name
            disCreep.memory.double = this.name
            this.memory.captain = false
            disCreep.memory.captain = true
          }
        }
      }
      return
    }
    if (this.memory.role == 'double-attack') {
      if (!Game.creeps[this.memory.double])
        return
      if (this.fatigue || Game.creeps[this.memory.double].fatigue)
        return
      if (Game.creeps[this.memory.double] && !this.pos.isNearTo(Game.creeps[this.memory.double]) && (!isInArray([0, 49], this.pos.x) && !isInArray([0, 49], this.pos.y)))
        return
      if (this.room.name != roomName || Game.shard.name != data.shard) {
        this.arriveTo(new RoomPosition(24, 24, roomName), 23, data.shard, data.shardData ? data.shardData : null)
      }
      else {
        // 对方开安全模式情况下 删除任务
        if (this.room.controller && this.room.controller.safeMode) {
          if (Game.shard.name == this.memory.shard)
            Game.rooms[this.memory.belong].removeMission(id)

          return
        }
        // 展开攻击
        const enemys = this.pos.findInRange(FIND_HOSTILE_CREEPS, 4, {
          filter: (creep) => {
            return !isInArray(Memory.whitelist, creep.owner.username) && !creep.pos.getStructure('rampart')
          },
        })
        if (enemys.length > 0) {
          this.goTo(enemys[0].pos, 1)
          this.attack(enemys[0])
          return
        }
        // 没有发现敌人就攻击建筑物
        const attack_flag = this.pos.findClosestByPath(FIND_FLAGS, {
          filter: (flag) => {
            return flag.name.indexOf('double_attack') == 0
          },
        })
        if (!attack_flag) {
          var Attstructure = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
            filter: (stru) => {
              return isInArray(['nuker', 'spawn', 'terminal', 'extension', 'tower', 'link', 'observer', 'lab', 'powerspawn', 'factory'], stru.structureType) && !stru.pos.getStructure('rampart')
            },
          })
          if (Attstructure) {
            const randomStr = Math.random().toString(36).substr(3)
            if (!Game.flags[`double_attack_${randomStr}`])
              Attstructure.pos.createFlag(`double_attack_${randomStr}`)
          }
        }
        if (!attack_flag) {
          // 还找不到就找重要的被ram覆盖的重要建筑攻击
          var CoverStructure = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
            filter: (stru) => {
              return stru.structureType == 'rampart' && stru.pos.getStructureList(['spawn', 'tower', 'storage', 'terminal']).length > 0
            },
          })
          if (CoverStructure) {
            this.say('⚔️', true)
            if (this.attack(CoverStructure) == ERR_NOT_IN_RANGE)
              this.goTo(CoverStructure.pos, 1)
            return
          }
          // 还找不到就直接找最近的wall或者rampart攻击
          var walls = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (stru) => {
              return isInArray([STRUCTURE_WALL, STRUCTURE_RAMPART], stru.structureType)
            },
          })
          if (walls) {
            this.say('⚔️', true)
            if (this.attack(walls) == ERR_NOT_IN_RANGE)
              this.goTo(walls.pos, 1)
          }
        }
        else {
          // 有旗子就攻击旗子下的建筑
          const stru = attack_flag.pos.lookFor(LOOK_STRUCTURES)
          if (stru.length > 0) {
            if (this.attack(stru[0]) == ERR_NOT_IN_RANGE)
              this.goTo(stru[0].pos, 1)
            return
          }
          attack_flag.remove() // 没有建筑就删除旗帜
        }
      }
    }
    else if (this.memory.role == 'double-dismantle') {
      if (!Game.creeps[this.memory.double])
        return
      if (this.fatigue || Game.creeps[this.memory.double].fatigue)
        return
      if (Game.creeps[this.memory.double] && !this.pos.isNearTo(Game.creeps[this.memory.double]) && (!isInArray([0, 49], this.pos.x) && !isInArray([0, 49], this.pos.y)))
        return
      if (this.room.name != roomName || Game.shard.name != data.shard) {
        this.arriveTo(new RoomPosition(24, 24, roomName), 23, data.shard, data.shardData ? data.shardData : null)
      }
      else {
        // 对方开安全模式情况下 删除任务
        if (this.room.controller && this.room.controller.safeMode) {
          if (Game.shard.name == this.memory.shard)
            Game.rooms[this.memory.belong].removeMission(id)

          return
        }
        // 开始拆墙
        const attack_flag = this.pos.findClosestByPath(FIND_FLAGS, {
          filter: (flag) => {
            return flag.name.indexOf('double_dismantle') == 0
          },
        })
        if (!attack_flag) {
          var Attstructure = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
            filter: (stru) => {
              return isInArray(['nuker', 'spawn', 'terminal', 'extension', 'tower', 'link', 'observer', 'lab', 'powerspawn', 'factory'], stru.structureType) && !stru.pos.getStructure('rampart')
            },
          })
          if (Attstructure) {
            const randomStr = Math.random().toString(36).substr(3)
            if (!Game.flags[`double_dismantle_${randomStr}`])
              Attstructure.pos.createFlag(`double_dismantle_${randomStr}`)
          }
        }
        if (!attack_flag) {
          // 还找不到就找重要的被ram覆盖的重要建筑攻击
          var CoverStructure = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
            filter: (stru) => {
              return stru.structureType == 'rampart' && stru.pos.getStructureList(['spawn', 'tower', 'storage', 'terminal']).length > 0
            },
          })
          if (CoverStructure) {
            this.say('⚔️', true)
            if (this.dismantle(CoverStructure) == ERR_NOT_IN_RANGE)
              this.goTo(CoverStructure.pos, 1)
            return
          }
          // 还找不到就直接找最近的wall或者rampart攻击
          var walls = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (stru) => {
              return isInArray([STRUCTURE_WALL, STRUCTURE_RAMPART], stru.structureType)
            },
          })
          if (walls) {
            this.say('⚔️', true)
            if (this.dismantle(walls) == ERR_NOT_IN_RANGE)
              this.goTo(walls.pos, 1)
          }
        }
        else {
          // 有旗子就攻击旗子下的建筑
          const stru = attack_flag.pos.lookFor(LOOK_STRUCTURES)
          if (stru.length > 0) {
            if (this.dismantle(stru[0]) == ERR_NOT_IN_RANGE)
              this.goTo(stru[0].pos, 1)
            return
          }
          attack_flag.remove() // 没有建筑就删除旗帜
        }
      }
    }
    else {
      const disCreepName = this.memory.double
      const portal = this.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (stru) => {
          return stru.structureType == 'portal'
        },
      })
      // 跨shard信息更新 可以防止一些可能出现的bug
      if (portal && data.shardData)
        this.updateShardAffirm()

      if (!Game.creeps[disCreepName] && portal) { this.arriveTo(new RoomPosition(25, 25, roomName), 20, data.shard, data.shardData ? data.shardData : null); return }
      if (Game.creeps[this.memory.double])
        this.moveTo(Game.creeps[this.memory.double])
      // 寻找敌人 远程攻击
      const enemy = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
        filter: (creep) => {
          return !isInArray(Memory.whitelist, creep.owner.username)
        },
      })
      if (enemy[0])
        this.rangedAttack(enemy[0])
      // 奶
      if (Game.creeps[this.memory.double]) {
        if (this.hits < this.hitsMax || Game.creeps[this.memory.double].hits < Game.creeps[this.memory.double].hitsMax) {
          if (this.hits < Game.creeps[this.memory.double].hits) { this.heal(this) }
          else {
            if (this.pos.isNearTo(Game.creeps[this.memory.double]))
              this.heal(Game.creeps[this.memory.double])
            else this.rangedHeal(Game.creeps[this.memory.double])
          }
          return
        }
      }
      // 默认治疗攻击爬，如果周围有友军，在自身血量满的情况下治疗友军
      const allys = this.pos.findInRange(FIND_CREEPS, 3, {
        filter: (creep) => {
          return (creep.my || isInArray(Memory.whitelist, creep.owner.username)) && creep.hitsMax - creep.hits > 350
        },
      })
      if (allys.length > 0) {
        // 寻找最近的爬
        let ally_ = allys[0]
        for (const i of allys) {
          if (getDistance(this.pos, i.pos) < getDistance(ally_.pos, this.pos))
            ally_ = i
        }
        if (this.pos.isNearTo(ally_))
          this.heal(ally_)
        else this.rangedHeal(ally_)
      }
      else {
        if (Game.creeps[this.memory.double])
          this.heal(Game.creeps[this.memory.double])
        else this.heal(this)
      }
    }
  }
}
