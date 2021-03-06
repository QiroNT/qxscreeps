/* 房间统计  轮子-非自己开发! */

import { colorfyLog } from '@/utils'

/* 与room.memory相关的和getRooms()需要根据自己情况更改 */
export function getColor(val: number) {
  if (val > 100)
    val = 100
  // let 百分之一 = (单色值范围) / 50;  单颜色的变化范围只在50%之内
  const per = (255 + 255) / 100
  let r = 0
  let g = 0
  let b = 0

  if (val < 50) {
    // 比例小于50的时候红色是越来越多的,直到红色为255时(红+绿)变为黄色.
    r = per * val
    g = 255
  }
  if (val >= 50) {
    // 比例大于50的时候绿色是越来越少的,直到0 变为纯红
    g = 255 - ((val - 50) * per)
    r = 255
  }
  r = Math.ceil(r)// 取整
  g = Math.ceil(g)// 取整
  b = Math.ceil(b)// 取整
  return `rgb(${r},${g},${b})`
}

export function colorHex(color: string) {
  const reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/
  if (/^(rgb|RGB)/.test(color)) {
    const aColor = color.replace(/(?:\(|\)|rgb|RGB)*/g, '').split(',')
    let strHex = '#'
    for (let i = 0; i < aColor.length; i++) {
      let hex = Number(aColor[i]).toString(16)
      if (hex === '0')
        hex += hex

      strHex += hex
    }
    if (strHex.length !== 7)
      strHex = color

    return strHex
  }
  else if (reg.test(color)) {
    const aNum = color.replace(/#/, '').split('')
    if (aNum.length === 6) {
      return color
    }
    else if (aNum.length === 3) {
      let numHex = '#'
      for (let i = 0; i < aNum.length; i++)
        numHex += (aNum[i] + aNum[i])

      return numHex
    }
  }
  else {
    return color
  }
}

function getRooms(): string[] {
  const rooms = []
  for (const name in Memory.roomControlData) {
    if (Game.rooms[name])
      rooms.push(name)
  }
  return rooms
}

export function getStore(roomName?: string) {
  if (roomName) {
    const storage = Game.rooms[roomName].storage
    const terminal = Game.rooms[roomName].terminal
    const factory = Game.rooms[roomName].memory.structureIdData?.factoryId ? Game.getObjectById(Game.rooms[roomName].memory.structureIdData!.factoryId!) : null
    const storageUsed = storage?.store.getUsedCapacity() || 0
    const storeCapacity = storage?.store.getCapacity() || 1
    const storageProportion = `${(storageUsed / storeCapacity * 100).toFixed(2)}%`
    const storageColor = colorHex(getColor(Math.ceil(storageUsed / storeCapacity * 100)))
    const terminalUsed = terminal?.store.getUsedCapacity() || 0
    const terminalCapacity = terminal?.store.getCapacity() || 1
    const terminalProportion = `${(terminalUsed / terminalCapacity * 100).toFixed(2)}%`
    const terminalColor = colorHex(getColor(Math.ceil(terminalUsed / terminalCapacity * 100)))
    const factoryUsed = factory?.store.getUsedCapacity() || 0
    const factoryCapacity = factory?.store.getCapacity() || 1
    const factoryProportion = `${(factoryUsed / factoryCapacity * 100).toFixed(2)}%`
    const factoryColor = colorHex(getColor(Math.ceil(factoryUsed / factoryCapacity * 100)))
    console.log(colorfyLog(roomName, 'blue'),
      'Storage:', colorfyLog(storageProportion, storageColor), ' ',
      'Terminal', colorfyLog(terminalProportion, terminalColor), ' ',
      'Factory', colorfyLog(factoryProportion, factoryColor))
  }
  else {
    const rooms = getRooms()
    for (let i = 0; i < rooms.length; i++) {
      const storage = Game.rooms[rooms[i]].storage
      const terminal = Game.rooms[rooms[i]].terminal
      const factory = Game.rooms[rooms[i]].memory.structureIdData?.factoryId ? Game.getObjectById(Game.rooms[rooms[i]].memory.structureIdData!.factoryId!) : null
      const storageUsed = storage?.store.getUsedCapacity() || 0
      const storeCapacity = storage?.store.getCapacity() || 1
      const storageProportion = `${(storageUsed / storeCapacity * 100).toFixed(2)}%`
      const storageColor = colorHex(getColor(Math.ceil(storageUsed / storeCapacity * 100)))
      const terminalUsed = terminal?.store.getUsedCapacity() || 0
      const terminalCapacity = terminal?.store.getCapacity() || 1
      const terminalProportion = `${(terminalUsed / terminalCapacity * 100).toFixed(2)}%`
      const terminalColor = colorHex(getColor(Math.ceil(terminalUsed / terminalCapacity * 100)))
      const factoryUsed = factory?.store.getUsedCapacity() || 0
      const factoryCapacity = factory?.store.getCapacity() || 1
      const factoryProportion = `${(factoryUsed / factoryCapacity * 100).toFixed(2)}%`
      const factoryColor = colorHex(getColor(Math.ceil(factoryUsed / factoryCapacity * 100)))
      console.log(colorfyLog(rooms[i], 'blue'),
        'Storage:', colorfyLog(storageProportion, storageColor), ' ',
        'Terminal', colorfyLog(terminalProportion, terminalColor), ' ',
        'Factory', colorfyLog(factoryProportion, factoryColor))
      // colorfyLog(string, colorHex(getColor(Math.ceil(storageUsed / storeCapacity * 100))))
    }
  }
}
