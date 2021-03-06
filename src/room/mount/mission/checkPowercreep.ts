import { isOPWR } from '@/powercreep/utils'

/* 超能powercreep相关任务 */
export default class RoomMissionPowerCreepExtension extends Room {
  /**
   * Pc任务管理器
   */
  public checkPowerCreep(): void {
    if (!this.controller || this.controller.level < 8)
      return

    const storage = global.structureCache[this.name].storage as StructureStorage
    if (!storage)
      return

    const pc = Game.powerCreeps[`${this.name}/queen/${Game.shard.name}`]
    const powerSpawn = global.structureCache[this.name].powerspawn as StructurePowerSpawn
    if (!pc) {
      return
    }
    else {
      // 看看是否存活，没存活就孵化
      if (!pc.ticksToLive && powerSpawn) {
        pc.spawn(powerSpawn)
        return
      }
    }

    this.checkPcEnhanceStorage()
    this.checkPcEnhanceLab()
    this.checkPcEnhanceExtension()
    this.checkPcEnhanceSpawn()
    this.checkPcEnhanceTower()
    // this.checkPcEnhanceFactory()
    this.checkPcEnhancePowerSpawn()
    this.checkPcEnhanceSource()
  }

  /**
   * 挂载增强 storage 的任务\
   * 适用于 queen 类型 pc
   */
  public checkPcEnhanceStorage(): void {
    if ((Game.time - global.Gtime[this.name]) % 7)
      return
    if (this.memory.toggles.StopEnhanceStorage)
      return

    const storage = this.memory.structureIdData?.storageID ? Game.getObjectById(this.memory.structureIdData.storageID) : null
    if (!storage)
      return

    const pc = Game.powerCreeps[`${this.name}/queen/${Game.shard.name}`]
    if (!pc?.powers[PWR_OPERATE_STORAGE] || pc.powers[PWR_OPERATE_STORAGE].cooldown)
      return

    // const effectDelay = false
    if (!storage.effects)
      storage.effects = []

    if (!isOPWR(storage) && this.countMissionByName('PowerCreep', '仓库扩容') <= 0) {
      // 发布任务
      this.addMission({
        name: '仓库扩容',
        delayTick: 40,
        category: 'PowerCreep',
        creepBind: { queen: { num: 1, bind: [] } },
      })
    }
  }

  /**
   * 挂载增强 lab 的任务\
   * 适用于 queen 类型 pc
   */
  public checkPcEnhanceLab(): void {
    if ((Game.time - global.Gtime[this.name]) % 10)
      return
    if (this.memory.toggles.StopEnhanceLab)
      return

    const storage = this.memory.structureIdData?.storageID ? Game.getObjectById(this.memory.structureIdData.storageID) : null
    if (!storage)
      return

    const pc = Game.powerCreeps[`${this.name}/queen/${Game.shard.name}`]
    if (!pc?.powers[PWR_OPERATE_LAB] || pc.powers[PWR_OPERATE_LAB].cooldown)
      return

    const disTask = this.getMissionModelByName('Room', '资源合成')
    if (!disTask)
      return

    if (this.countMissionByName('PowerCreep', '合成加速') > 0)
      return

    const labs = []
    for (const id of disTask.data.comData) {
      const lab = Game.getObjectById(id) as StructureLab
      if (lab && !isOPWR(lab))
        labs.push(id)
    }

    if (labs.length <= 0)
      return

    this.addMission({
      name: '合成加速',
      delayTick: 50,
      category: 'PowerCreep',
      creepBind: { queen: { num: 1, bind: [] } },
      data: {
        lab: labs,
      },
    })
  }

  /**
   * 挂载防御塔任务，配合主动防御\
   * 适用于 queen 类型 pc
   */
  public checkPcEnhanceTower(): void {
    if ((Game.time - global.Gtime[this.name]) % 11)
      return
    if (this.memory.state !== 'war' || !this.memory.toggles.AutoDefend)
      return
    if (this.memory.toggles.StopEnhanceTower)
      return

    const storage = this.memory.structureIdData?.storageID ? Game.getObjectById(this.memory.structureIdData.storageID) : null
    if (!storage)
      return

    const pc = Game.powerCreeps[`${this.name}/queen/${Game.shard.name}`]
    if (!pc?.powers[PWR_OPERATE_TOWER] || pc.powers[PWR_OPERATE_TOWER].cooldown)
      return

    const towers = []
    for (const id of this.memory.structureIdData?.AtowerID ?? []) {
      const tower = Game.getObjectById(id) as StructureTower
      if (tower && !isOPWR(tower))
        towers.push(tower.id)
    }

    if (towers.length <= 0)
      return

    if (this.countMissionByName('PowerCreep', '塔防增强') > 0)
      return

    // 发布任务
    this.addMission({
      name: '塔防增强',
      delayTick: 70,
      category: 'PowerCreep',
      creepBind: { queen: { num: 1, bind: [] } },
      data: {
        tower: towers,
      },
    })
  }

  /**
   * 挂载填充拓展任务
   * 适用于 queen 类型 pc
   */
  public checkPcEnhanceExtension(): void {
    if ((Game.time - global.Gtime[this.name]) % 25)
      return
    if (this.memory.toggles.StopEnhanceExtension)
      return

    const storage = this.memory.structureIdData?.storageID ? Game.getObjectById(this.memory.structureIdData.storageID) : null
    if (!storage || storage.store.getUsedCapacity('energy') < 20000)
      return

    const pc = Game.powerCreeps[`${this.name}/queen/${Game.shard.name}`]
    if (!pc?.powers[PWR_OPERATE_EXTENSION] || pc.powers[PWR_OPERATE_EXTENSION].cooldown)
      return

    if (this.energyAvailable < this.energyCapacityAvailable * 0.3
       && this.countMissionByName('PowerCreep', '拓展填充') <= 0) {
      this.addMission({
        name: '拓展填充',
        delayTick: 30,
        category: 'PowerCreep',
        creepBind: { queen: { num: 1, bind: [] } },
        data: {},
      })
    }
  }

  /**
   * 挂载 spawn 加速任务
   * 适用于 queen 类型 pc
   */
  public checkPcEnhanceSpawn(): void {
    if ((Game.time - global.Gtime[this.name]) % 13)
      return
    if (this.memory.toggles.StopEnhanceSpawn)
      return

    const storage = this.memory.structureIdData?.storageID ? Game.getObjectById(this.memory.structureIdData.storageID) : null
    if (!storage)
      return

    const pc = Game.powerCreeps[`${this.name}/queen/${Game.shard.name}`]
    if (!pc?.powers[PWR_OPERATE_SPAWN] || pc.powers[PWR_OPERATE_SPAWN].cooldown)
      return

    // 在战争时期、对外战争时期，启动
    let isOnWar = false
    if (this.memory.state === 'war' && this.memory.toggles.AutoDefend) {
      isOnWar = true
    }
    else {
      for (const i of ['攻防一体', '双人小队', '四人小队', '紧急支援']) {
        if (this.countMissionByName('Creep', i) > 0)
          isOnWar = true
      }
    }

    if (!isOnWar)
      return

    this.addMission({
      name: '虫卵强化',
      delayTick: 50,
      category: 'PowerCreep',
      creepBind: { queen: { num: 1, bind: [] } },
      data: {},
    })
  }

  /**
   * 挂载升级工厂任务
   * 适用于 queen 类型 pc
   */
  public checkPcEnhanceFactory(): void {
    // if ((Game.time - global.Gtime[this.name]) % 14)
    //   return
    if (this.memory.toggles.StopEnhanceFactory)
      return

    const storage = this.memory.structureIdData?.storageID ? Game.getObjectById(this.memory.structureIdData.storageID) : null
    if (!storage)
      return

    const pc = Game.powerCreeps[`${this.name}/queen/${Game.shard.name}`]
    if (!pc?.powers[PWR_OPERATE_FACTORY] || pc.powers[PWR_OPERATE_FACTORY].cooldown)
      return

    if (this.countMissionByName('PowerCreep', '工厂强化') > 0)
      return

    this.addMission({
      name: '工厂强化',
      delayTick: 50,
      category: 'PowerCreep',
      creepBind: { queen: { num: 1, bind: [] } },
      data: {},
    })
  }

  /**
   * 挂载 powerspawn 增强任务
   * 适用于 queen 类型 pc
   */
  public checkPcEnhancePowerSpawn(): void {
    if ((Game.time - global.Gtime[this.name]) % 13)
      return
    if (this.memory.toggles.StopEnhancePowerSpawn)
      return

    const storage = this.memory.structureIdData?.storageID ? Game.getObjectById(this.memory.structureIdData.storageID) : null
    if (!storage)
      return

    const pc = Game.powerCreeps[`${this.name}/queen/${Game.shard.name}`]
    if (!pc?.powers[PWR_OPERATE_POWER] || pc.powers[PWR_OPERATE_POWER].cooldown)
      return

    if (this.countMissionByName('PowerCreep', 'power强化') > 0)
      return

    this.addMission({
      name: 'power强化',
      delayTick: 50,
      category: 'PowerCreep',
      creepBind: { queen: { num: 1, bind: [] } },
      data: {},
    })
  }

  /**
   * 挂载 source 增强任务
   * 适用于 queen 类型 pc
   */
  public checkPcEnhanceSource(): void {
    if ((Game.time - global.Gtime[this.name]) % 13)
      return
    if (this.memory.toggles.StopEnhanceSource)
      return

    if (!this.memory.structureIdData?.source)
      return

    const pc = Game.powerCreeps[`${this.name}/queen/${Game.shard.name}`]
    if (!pc || !pc.powers[PWR_REGEN_SOURCE] || pc.powers[PWR_REGEN_SOURCE].cooldown)
      return

    if (this.countMissionByName('PowerCreep', 'source强化') > 0)
      return

    for (const i in this.memory.structureIdData.source) {
      const source = Game.getObjectById(this.memory.structureIdData.source[i])
      if (!source)
        continue

      if (source.effects) {
        if (source.effects.length > 0)
          continue
      }

      this.addMission({
        name: 'source强化',
        delayTick: 50,
        category: 'PowerCreep',
        creepBind: {
          queen: { num: 1, bind: [] },
        },
        data: {
          source_id: source.id,
        },
        maxConcurrent: 2,
      })
    }
  }
}
