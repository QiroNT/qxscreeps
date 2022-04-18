import { avePrice, haveOrder, highestPrice } from '@/module/fun/funtion'
import { colorfyLog, isInArray, sortByKey } from '@/utils'

// terminal 扩展
export default class terminalExtension extends StructureTerminal {
  public manageMission(): void {
    if (this.room.countMissionByName('Creep', '急速冲级') > 0)
      return // 急速冲级状态下停止terminal功能
    const allmyTask = []
    for (const task of this.room.memory.mission.Structure) {
      if (!task.structure)
        continue
      if (isInArray(task.structure, this.id))
        allmyTask.push(task)
    }
    let thisTask = null
    /* 按照优先级排序 */
    if (allmyTask.length >= 1)
      allmyTask.sort(sortByKey('level'))
    thisTask = allmyTask[0]
    if (!thisTask || !isInArray(['资源传送'], thisTask.name)) {
      /* terminal默认操作 */
      this.ResourceBalance() // 资源平衡
      this.ResourceMarket() // 资源买卖
      if (!thisTask)
        return
    }
    if (thisTask.delayTick < 99995)
      thisTask.delayTick--
    switch (thisTask.name) {
      case '资源传送':{ this.ResourceSend(thisTask); break }
      case '资源购买':{ this.ResourceDeal(thisTask); break }
    }
  }

  /**
     * 资源平衡函数,用于平衡房间中资源数量以及资源在terminal和storage中的分布,尤其是能量和原矿
     */
  public ResourceBalance(): void {
    this.RsourceMemory()
    // terminal资源平衡
    if ((Game.time - global.Gtime[this.room.name]) % 7)
      return
    const storage_ = global.structureCache[this.room.name].storage as StructureStorage
    if (!storage_) { console.log(`找不到global.Stru['${this.room.name}']['storage]!`); return }
    for (var i in this.store) {
      if (this.room.countCreepMissionByName('manage', '物流运输') >= 1)
        return
      const num = this.store[i] // 数量
      if (!this.room.memory.TerminalData[i] || !this.room.memory.TerminalData[i].num) // terminalData里没有该数据
      {
        if (storage_.store.getFreeCapacity() < 40000)
          continue
        const thisTask = this.room.generateCarryMission({ manage: { num: 1, bind: [] } }, 20, this.room.name, this.pos.x, this.pos.y, this.room.name, storage_.pos.x, storage_.pos.y, i as ResourceConstant, num)
        this.room.addMission(thisTask)
      }
      else {
        if (num > this.room.memory.TerminalData[i].num) {
          if (storage_.store.getFreeCapacity() < 40000)
            continue
          const thisTask = this.room.generateCarryMission({ manage: { num: 1, bind: [] } }, 20, this.room.name, this.pos.x, this.pos.y, this.room.name, storage_.pos.x, storage_.pos.y, i as ResourceConstant, num - this.room.memory.TerminalData[i].num)
          this.room.addMission(thisTask)
        }
      }
    }
    for (var i in this.room.memory.TerminalData) {
      if (this.room.countCreepMissionByName('manage', '物流运输') >= 1)
        return
      if (!this.room.memory.TerminalData[i].fill)
        continue
      const num = this.store.getUsedCapacity(i as ResourceConstant)
      if (num < this.room.memory.TerminalData[i].num) {
        if (this.store.getFreeCapacity() < 5000)
          continue
        if (i == 'energy') {
          if (storage_.store.getUsedCapacity('energy') <= 20000)
            continue
        }
        else {
          if (storage_.store.getUsedCapacity(i as ResourceConstant) <= 0 && storage_.store.getUsedCapacity(i as ResourceConstant) + num < this.room.memory.TerminalData[i].num)
            continue
        }
        const thisTask = this.room.generateCarryMission({ manage: { num: 1, bind: [] } }, 20, this.room.name, storage_.pos.x, storage_.pos.y, this.room.name, this.pos.x, this.pos.y, i as ResourceConstant, this.room.memory.TerminalData[i].num - num > 0 ? this.room.memory.TerminalData[i].num - num : 100)
        this.room.addMission(thisTask)
      }
    }
  }

  /**
     * 资源记忆更新函数
     * */
  public RsourceMemory(): void {
    /* terminal自身资源管理 */
    const terminalData = this.room.memory.TerminalData
    for (const i in terminalData) {
      /* 数量小于0就删除数据，节省memory */
      if (terminalData[i].num <= 0)
        delete terminalData[i]
    }
  }

  /**
     * 资源买卖函数 只买能量、挂单、卖 (不deal买资源)
     */
  public ResourceMarket(): void {
    if ((Game.time - global.Gtime[this.room.name]) % 27)
      return
    // 能量自动购买区 [与MarketData无关] storage内能量小于200000时自动购买
    /* 清理过期订单 */
    if (Object.keys(Game.market.orders).length > 80) {
      for (const j in Game.market.orders) {
        const order = Game.market.getOrderById(j)
        if (!order.remainingAmount)
          Game.market.cancelOrder(j)
      }
    }
    const storage_ = global.structureCache[this.room.name].storage as StructureStorage
    if (!storage_) { console.log(`找不到global.Stru['${this.room.name}']['storage]!`); return }
    // 能量购买函数
    const storeNum = storage_.store.getUsedCapacity('energy') + this.store.getUsedCapacity('energy')
    // 能量一般少的情况下，下平均价格订单购买能量
    if (storeNum < 250000 && storeNum >= 100000) {
      const ave = avePrice('energy', 1)
      const thisprice_ = ave * 1.1
      if (!haveOrder(this.room.name, 'energy', 'buy', thisprice_, -0.2)) {
        const result = Game.market.createOrder({
          type: ORDER_BUY,
          resourceType: 'energy',
          price: thisprice_ + 0.001,
          totalAmount: 100000,
          roomName: this.room.name,
        })
        if (result != OK)
          console.log('创建能量订单出错,房间', this.room.name)
        console.log(colorfyLog(`[普通]房间${this.room.name}创建energy订单,价格:${thisprice_ + 0.001};数量:100000`, 'green', true))
      }
    }
    // 能量极少的情况下，下市场合理范围内最高价格订单
    else if (storeNum < 100000) {
      const ave = avePrice('energy', 2)
      const highest = highestPrice('energy', 'buy', ave + 6)
      if (!haveOrder(this.room.name, 'energy', 'buy', highest, -0.1)) {
        const result = Game.market.createOrder({
          type: ORDER_BUY,
          resourceType: 'energy',
          price: highest + 0.001,
          totalAmount: 200000,
          roomName: this.room.name,
        })
        if (result != OK)
          console.log('创建能量订单出错,房间', this.room.name)
        console.log(colorfyLog(`[紧急]房间${this.room.name}创建energy订单,价格:${highest + 0.01};数量:100000`, 'green', true))
      }
    }
    /* 仓库资源过于饱和就卖掉能量 超出则不卖(考虑到pc技能间隔) */
    if (storage_.store.getFreeCapacity() < 50000 && storage_.store.getCapacity() >= storage_.store.getUsedCapacity()) {
      /* 如果仓库饱和(小于200k空间)，而且仓库能量超过400K,就卖能量 */
      if (storage_.store.getUsedCapacity('energy') > 350000) {
        if (!this.room.memory.market)
          this.room.memory.market = {}
        if (!this.room.memory.market.deal)
          this.room.memory.market.deal = []
        let bR = true
        for (const od of this.room.memory.market.deal) {
          if (od.rType == 'energy')
            bR = false
        }
        if (bR) {
          /* 下达自动deal的任务 */
          this.room.memory.market.deal.push({ rType: 'energy', num: 100000 })
        }
      }
    }
    // 其他类型资源的交易 【考虑到已经有了资源调度模块的存在，这里主要是卖】
    LoopA:
    for (const t in this.room.memory.market) {
      // deal类型
      if (t == 'deal') {
        if (this.store.getUsedCapacity('energy') < 50000)
          continue LoopA // terminal空闲资源过少便不会继续
        LoopB:
        for (var i of this.room.memory.market.deal) {
          if (i.rType != 'energy')
            this.room.memory.TerminalData[i.rType] = { num: i.unit ? i.unit : 5000, fill: true }

          /* 数量少了就删除 */
          if (i.num <= 0) {
            if (i.rType != 'energy')
              delete this.room.memory.TerminalData[i.rType]
            var index = this.room.memory.market.deal.indexOf(i)
            this.room.memory.market.deal.splice(index, 1)
            continue LoopB
          }
          if (this.cooldown)
            continue LoopA // 冷却模式下进行不了其他deal了
          let a = 100; const b = 50000;
          (COMMODITIES[i.rType] && COMMODITIES[i.rType].level) ? a = 0 : a
          let price = 0.05
          if (COMMODITIES[i.rType] && COMMODITIES[i.rType].level)
            price = 10000
          if (i.price)
            price = i.price
          const orders = Game.market.getAllOrders(order => order.resourceType == i.rType
                        && price <= order.price && order.type == ORDER_BUY && order.amount > a && order.amount <= b)
          if (orders.length <= 0)
            continue LoopB
          /* 按价格从低到高排列 */
          const newOrderList = orders.sort(sortByKey('price'))
          // 倒数第二 没有就倒数第一
          const thisDealOrder = newOrderList.length > 1 ? newOrderList[newOrderList.length - 2] : newOrderList[newOrderList.length - 1]
          if (!thisDealOrder)
            continue LoopB
          if (storage_.store.getUsedCapacity(i.rType) <= 0 && this.room.countCreepMissionByName('manage', '物流运输') <= 0) {
            if (i.rType != 'energy')
              delete this.room.memory.TerminalData[i.rType]
            var index = this.room.memory.market.deal.indexOf(i)
            this.room.memory.market.deal.splice(index, 1)
            continue LoopB
          }
          if (thisDealOrder.amount >= this.store.getUsedCapacity(i.rType)) {
            Game.market.deal(thisDealOrder.id, this.store.getUsedCapacity(i.rType), this.room.name)
            i.num -= this.store.getUsedCapacity(i.rType)
            break LoopA
          }
          else {
            Game.market.deal(thisDealOrder.id, thisDealOrder.amount, this.room.name)
            i.num -= thisDealOrder.amount
            break LoopA
          }
        }
      }
      // order类型
      else if (t == 'order') {
        LoopC:
        for (const l of this.room.memory.market.order) {
          if (l.rType != 'energy')
            this.room.memory.TerminalData[l.rType] = { num: l.unit ? l.unit : 5000, fill: true }

          // 查询有无订单
          if (!l.id) {
            const myOrder = haveOrder(this.room.name, l.rType, 'sell')
            if (!myOrder) {
              console.log(colorfyLog(`[market] 房间${this.room.name}-rType:${l.rType}创建订单!`, 'yellow'))
              // 没有就创建订单
              const result = Game.market.createOrder({
                type: ORDER_SELL,
                resourceType: l.rType,
                price: l.price,
                totalAmount: l.num,
                roomName: this.room.name,
              })
              if (result != OK)
                continue LoopC
            }
            LoopO:
            for (const o in Game.market.orders) {
              const order = Game.market.getOrderById(o)
              if (order.remainingAmount <= 0) { Game.market.cancelOrder(o); continue LoopO }
              if (order.roomName == this.room.name && order.resourceType == l.rType && order.type == 'sell')
                l.id = o
            }
            continue LoopC
          }
          else {
            const order = Game.market.getOrderById(l.id)
            if (!order || !order.remainingAmount) // 取消订单信息
            {
              if (l.rType != 'energy')
                delete this.room.memory.TerminalData[l.rType]
              console.log(colorfyLog(`[market] 房间${this.room.name}订单ID:${l.id},rType:${l.rType}的删除订单!`, 'blue'))
              var index = this.room.memory.market.order.indexOf(l)
              this.room.memory.market.order.splice(index, 1)
              continue LoopC
            }
            // 价格
            const price = order.price
            const standprice = l.price
            // 价格太低或太高都会改变订单价格
            if (standprice <= price / 3 || standprice >= price * 3) {
              Game.market.changeOrderPrice(l.id, l.price)
              console.log(`[market] 房间${this.room.name}改变订单ID:${l.id},type:${l.rType}的价格为${l.price}`)
            }
            // 收到改变价格指令，也会改变订单价格
            if (l.changePrice) {
              Game.market.changeOrderPrice(l.id, l.price)
              console.log(`[market] 房间${this.room.name}改变订单ID:${l.id},type:${l.rType}的价格为${l.price}`)
              l.changePrice = false
            }
          }
        }
      }
    }
  }

  /**
     * 资源传送
     */
  public ResourceSend(task: MissionModel): void {
    if (this.cooldown && this.cooldown > 0)
      return
    if (!task.data || !task.data.disRoom) // 任务数据有问题
    {
      this.room.removeMission(task.id)
      return
    }
    if (!task.state)
      task.state = 1 // 1状态下，搜集资源
    if (task.state == 1) {
      if (Game.time % 10)
        return /* 每10tick监测一次 */
      if (task.data.num <= 0 || task.data.num == undefined)
        this.room.removeMission(task.id)
      if (this.room.countCreepMissionByName('manage', '物流运输') > 0)
        return // manage爬虫有任务时就不管
      // 路费
      const wastage = Game.market.calcTransactionCost(task.data.num, this.room.name, task.data.disRoom)
      /* 如果非能量资源且路费不够，发布资源搬运任务，优先寻找storage */
      const storage_ = global.structureCache[this.room.name].storage as StructureStorage
      // terminal的剩余资源
      const remain = this.store.getFreeCapacity()
      /* 路费判断 */
      if (wastage > this.store.getUsedCapacity('energy')) {
        /* 只有在能量富裕的情况下才会允许进入下一阶段 */
        if (storage_ && (storage_.store.getUsedCapacity('energy') + this.store.getUsedCapacity('energy') - 5000) > wastage && remain > (wastage - this.store.getUsedCapacity('energy'))) {
          /* 下布搬运任务 */
          var thisTask = this.room.generateCarryMission({ manage: { num: 1, bind: [] } }, 40, this.room.name, storage_.pos.x, storage_.pos.y, this.room.name, this.pos.x, this.pos.y, 'energy', wastage - this.store.getUsedCapacity('energy'))
          this.room.addMission(thisTask)
          return
        }
        /* 条件不满足就自动删除任务 */
        this.room.removeMission(task.id)
        return
      }
      console.log('资源传送任务监控中: ###########################\n 房间:', this.room.name, '--->', task.data.disRoom, ' 运送资源：', task.data.rType)
      console.log('路费:', colorfyLog(`${wastage}`, 'yellow'), 'energy  ', '终端拥有能量:', colorfyLog(`${this.store.getUsedCapacity('energy')}`, 'yellow'), 'energy')
      /* 资源判断 */
      const cargoNum: number = task.data.rType == 'energy' ? this.store.getUsedCapacity(task.data.rType) - wastage : this.store.getUsedCapacity(task.data.rType)
      console.log('终端拥有资源量:', colorfyLog(`${cargoNum}`, 'blue'), ' 仓库拥有资源量:', storage_.store.getUsedCapacity(task.data.rType), ' 任务所需资源量:', task.data.num)
      if (task.data.num > cargoNum) {
        if (storage_ && (storage_.store.getUsedCapacity(task.data.rType) + this.store.getUsedCapacity(task.data.rType)) >= (task.data.num - 1600) && remain > task.data.num - cargoNum) {
          /* 下布搬运任务 */
          var thisTask = this.room.generateCarryMission({ manage: { num: 1, bind: [] } }, 40, this.room.name, storage_.pos.x, storage_.pos.y, this.room.name, this.pos.x, this.pos.y, task.data.rType, task.data.num - cargoNum)
          this.room.addMission(thisTask)
          return
        }
        /* 条件不满足就自动删除任务 */
        this.room.removeMission(task.id)
        return
      }
      /* 都满足条件了就进入状态2 */
      task.state = 2
    }
    else if (task.state == 2) {
      const result = this.send(task.data.rType as ResourceConstant, task.data.num, task.data.disRoom as string)
      if (result == -6) /* 能量不够就重新返回状态1 */
      {
        console.log(colorfyLog(`房间${this.room.name}发送资源${task.data.rType}失败!`, 'read', true))
        task.state = 1
      }
      else if (result == OK) {
        /* 如果传送成功，就删除任务 */
        this.room.removeMission(task.id)
      }
    }
  }

  /**
     * 资源购买 (deal)
     */
  public ResourceDeal(task: MissionModel): void {
    if ((Game.time - global.Gtime[this.room.name]) % 10)
      return
    if (this.cooldown || this.store.getUsedCapacity('energy') < 45000)
      return
    if (!task.data) { this.room.removeMission(task.id); return }
    const money = Game.market.credits
    if (money <= 0 || task.data.num > 50000) { this.room.removeMission(task.id); return }
    const rType = task.data.rType
    const num = task.data.num
    const HistoryList = Game.market.getHistory(rType)
    const HistoryLength = HistoryList.length
    if (HistoryList.length < 3) { console.log('marketHistroy错误'); return }// 以防特殊情况
    let allNum = 0
    for (let iii = HistoryLength - 3; iii < HistoryLength; iii++)
      allNum += HistoryList[iii].avgPrice

    const avePrice = allNum / 3 // 平均价格 [近3天]
    // 获取该资源的平均价格
    const maxPrice = avePrice + (task.data.range ? task.data.range : 50) // 范围
    /* 在市场上寻找 */
    const orders = Game.market.getAllOrders(order => order.resourceType == rType
            && order.type == ORDER_SELL && order.price <= maxPrice)
    if (orders.length <= 0)
      return
    /* 寻找价格最低的 */
    const newOrderList = orders.sort(sortByKey('price'))
    for (const ii of newOrderList) {
      if (ii.price > maxPrice)
        return
      if (ii.amount >= num) {
        if (Game.market.deal(ii.id, num, this.room.name) == OK) {
          this.room.removeMission(task.id)
          return
        }
        else { return }
      }
      else {
        if (Game.market.deal(ii.id, ii.amount, this.room.name) == OK)
          task.data.num -= ii.amount
        return
      }
    }
  }
}
