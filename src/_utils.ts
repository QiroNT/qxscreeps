/* 存放全局方法 */

/*  判定是否在列表里 */
export function isInArray(arr: any[], value: any): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (value === arr[i])
      return true
  }

  return false
}

/* 用于多structure类型的filter判断 */
export function filter_structure(structure: Structure, arr: StructureConstant[]): boolean {
  return isInArray(arr, structure.structureType)
}

/* 寻找列表中hit最小且没有超过指定值的建筑  模式0 为hit最小， 模式1为hit差值最小 模式2为hits/hitsMax比值最小 */
export function LeastHit(arr: Structure[], mode = 0, radio?: number): Structure | undefined {
  if (arr.length > 0) {
    let ret: Structure = arr[0]
    if (mode === 0) {
      for (const index of arr) {
        if (index.hits < ret.hits)
          ret = index
      }

      return ret
    }
    if (mode === 1) {
      for (const index of arr) {
        if (index.hitsMax - index.hits > ret.hitsMax - ret.hits)
          ret = index
      }

      return ret
    }
    if (mode === 2) {
      for (const index of arr) {
        if (index.hits / index.hitsMax < ret.hits / ret.hitsMax)
          ret = index
      }

      if (radio) {
        if (ret.hits / ret.hitsMax < radio)
          return ret
        else return undefined
      }
      else {
        return ret
      }
    }
  }
  return undefined
}

/* 获取两点间距离(勾股定理) */
export function getDistance(po1: RoomPosition, po2: RoomPosition): number {
  return Math.sqrt((po1.x - po2.x) ** 2 + (po1.y - po2.y) ** 2)
}

/* 生成爬虫指定体型 */
export function GenerateAbility(
  work?: number,
  carry?: number,
  move?: number,
  attack?: number,
  range_attack?: number,
  heal?: number,
  claim?: number,
  tough?: number,
): BodyPartConstant[] {
  let body_list = []
  // 生成优先级，越往前越优先
  if (tough)
    body_list = AddList(body_list, tough, TOUGH)
  if (work)
    body_list = AddList(body_list, work, WORK)
  if (attack)
    body_list = AddList(body_list, attack, ATTACK)
  if (range_attack)
    body_list = AddList(body_list, range_attack, RANGED_ATTACK)
  if (carry)
    body_list = AddList(body_list, carry, CARRY)
  if (claim)
    body_list = AddList(body_list, claim, CLAIM)
  if (move)
    body_list = AddList(body_list, move, MOVE)
  if (heal)
    body_list = AddList(body_list, heal, HEAL)
  return body_list
}

// 用于对bodypartconstant[] 列表进行自适应化，使得爬虫房间能生产该爬虫，具体逻辑为寻找该bodypart中数量最多的，对其进行减法运算，直到达到目的，但数量到1时将不再减少
export function adaption_body(arr: BodyPartConstant[], critical_num: number): BodyPartConstant[] {
  while (CalculateEnergy(arr) > critical_num) {
    if (critical_num <= 100)
      return arr
    const m_body = most_body(arr)
    if (!m_body)
      return arr
    const index = arr.indexOf(m_body)
    if (index > -1)
      arr.splice(index, 1)
  }
  return arr
}

// 寻找身体部件中数量最多的部件
export function most_body(arr: BodyPartConstant[]): BodyPartConstant {
  const bN = {}
  if (!arr || arr.length <= 0) {
    console.log('【自适应】列表有问题')
    return null
  }
  for (const bc of arr) {
    if (!bN[bc])
      bN[bc] = getSameNum(bc, arr)
  }

  let bM = null
  if (Object.keys(bN).length === 1)
    return arr[0]
  for (const i in bN) {
    if (bN[i] > 1 && (bM == null ? bN[i] > 1 : bN[i] > bN[bM]))
      bM = i
  }

  if (!bM) {
    console.log('【自适应】查找最多部件数量错误 arr:', arr)
    return null
  }
  return bM
}

/**
 * 获取数组中相同元素的个数
 * @param val 相同的元素
 * @param arr 传入数组
 */
export function getSameNum(val, arr): number {
  const processArr = []
  for (const i of arr) {
    if (i === val)
      processArr.push(i)
  }

  return processArr.length
}

/* 判断孵化所需能量 */
export function CalculateEnergy(abilityList: BodyPartConstant[]): number {
  let num = 0
  for (const part of abilityList) {
    if (part === WORK)
      num += 100
    if (part === MOVE)
      num += 50
    if (part === CARRY)
      num += 50
    if (part === ATTACK)
      num += 80
    if (part === RANGED_ATTACK)
      num += 150
    if (part === HEAL)
      num += 250
    if (part === CLAIM)
      num += 600
    if (part === TOUGH)
      num += 10
  }
  return num
}

/* 向列表中添加指定数量元素 */
export function AddList(arr: any[], time_: number, element: any): any[] {
  const list_ = arr
  for (let i = 0; i < time_; i++) list_.push(element)

  return list_
}

/* 按照列表中某个属性进行排序 配合sort使用 */
export function compare(property) {
  return function(a, b) {
    const value1 = a[property]
    const value2 = b[property]
    return value1 - value2
  }
}

// 字符串压缩
export function compileStr(str) {
  let count = 1
  let newStr = ''
  for (let i = 0; i < str.length - 1; i++) {
    if (str[i] === str[i + 1]) {
      count++
      continue // 如果此时的字符和后一个字符想等的话 那么跳出此次循环 继续下次循环
    }
    else {
      if (count === 1) {
        newStr += str[i]
      }
      else {
        newStr += count + str[i]
        count = 1
      }
    }
  }
  return newStr
}

/* 正则获取房间信息 return {coor:['E','S'],num:[44,45]} */
const regRoom = /^([WE])(\d{1,2})([NS])(\d{1,2})$/
export function regularRoom(roomName: string): { coor: string[]; num: number[] } {
  const result = roomName.match(regRoom)
  if (!result)
    throw new Error(`[regularRoom] 解析房间名错误 roomName:${roomName}`)
  return {
    coor: [result[1], result[3]],
    num: [parseInt(result[2]), parseInt(result[4])],
  }
}

/* 计算两个房间之间的距离   */
export function roomDistance(roomName1: string, roomName2: string): number {
  const Data1 = regularRoom(roomName1)
  const Data2 = regularRoom(roomName2)
  let Xdistance = 0
  let Ydistance = 0
  if (Data1.coor[0] === Data2.coor[0]) {
    Xdistance = Math.abs(Data1.num[0] - Data2.num[0])
  }
  else {
    /* 过渡处 */
    Xdistance = 2 * Data1.num[0]
  }
  if (Data1.coor[1] === Data2.coor[1]) {
    Ydistance = Math.abs(Data1.num[1] - Data2.num[1])
  }
  else {
    /* 过渡处 */
    Ydistance = 2 * Data1.num[1]
  }

  return Xdistance > Ydistance ? Xdistance : Ydistance
}

/* 获取两个房间之间最近的星门房 */
export function closestPotalRoom(roomName1: string, roomName2: string): string {
  const Data1 = regularRoom(roomName1)
  const Data2 = regularRoom(roomName2)
  /* 分别计算距离每个房间最近的portal房，如果两个房的最近是相等的就return该房 */
  /* 如果不相等，就对比 A房--A最近Portal房距离 + A最近Portal房--B房距离 和 B房--B最近Portal房距离 + B最近Portal房--A房距离 */
  const NData1R = `${Data1.coor[0]}`
  + `${Data1.num[0] % 10 > 5 ? Data1.num[0] + (10 - (Data1.num[0] % 10)) : Data1.num[0] - (Data1.num[0] % 10)}`
  + `${Data1.coor[1]}${Data1.num[1] % 10 > 5 ? Data1.num[1] + (10 - (Data1.num[1] % 10)) : Data1.num[1] - (Data1.num[1] % 10)}`
  const NData2R = `${Data2.coor[0]}${
    Data2.num[0] % 10 > 5 ? Data2.num[0] + (10 - (Data2.num[0] % 10)) : Data2.num[0] - (Data2.num[0] % 10)
  }${Data2.coor[1]}${Data2.num[1] % 10 > 5 ? Data2.num[1] + (10 - (Data2.num[1] % 10)) : Data2.num[1] - (Data2.num[1] % 10)}`
  if (NData1R === NData2R) {
    return NData1R
  }
  else {
    const Adistance = roomDistance(roomName1, NData1R) + roomDistance(roomName2, NData1R)
    const Bdistance = roomDistance(roomName1, NData2R) + roomDistance(roomName2, NData2R)
    if (Adistance > Bdistance)
      return NData2R
    else return NData1R
  }
}

/* 获取指定方向相反的方向 */
export function getOppositeDirection(direction: DirectionConstant): DirectionConstant {
  return <DirectionConstant>(((direction + 3) % 8) + 1)
}

/* 打印指定颜色 */
type Colors = 'red' | 'blue' | 'green' | 'yellow' | 'orange'
const colors: Record<Colors, string> = {
  red: '#ef9a9a',
  green: '#6b9955',
  yellow: '#c5c599',
  blue: '#8dc5e3',
  orange: '#ff9d00',
}
export function colorfy(content: string, colorName?: Colors | string, bolder = false): string {
  const colorStyle = colorName ? `color: ${colorName in colors ? colors[colorName as Colors] : colorName};` : ''
  const bolderStyle = bolder ? 'font-weight: bolder;' : ''

  return `<text style="${[colorStyle, bolderStyle].join(' ')}">${content}</text>`
}

/* 生成一个不会重复的ID */
export function generateID(): string {
  // 生成n位长度的字符串
  return `${Math.random().toString(36).substr(3)}${Game.time}`
}

/* 压缩位置函数 */
export function zipPosition(position: RoomPosition): string {
  const x = position.x
  const y = position.y
  const room = position.roomName
  return `${x}/${y}/${room}`
}

/* 将压缩出来的字符串解压 例如 23/42/W1N1 */
export function unzipPosition(str: string): RoomPosition | undefined {
  const info = str.split('/')
  return info.length === 3
    ? new RoomPosition(Number(info[0]), Number(info[1]), info[2])
    : undefined
}

/**
 * 统计全局单个资源量 非自开发
 */
export function StatisticalResources(resource: ResourceConstant): number {
  let num = 0
  for (const name in Memory.roomControlData) {
    const room = Game.rooms[name]
    if (room?.controller?.my) {
      const storage = room.storage
      const terminal = room.terminal
      if (storage)
        num += storage.store[resource]
      if (terminal)
        num += terminal.store[resource]
    }
  }
  return num
}

/**
 * 给指定文本添加颜色
 *
 * @param content 要添加颜色的文本
 * @param colorName 要添加的颜色常量字符串
 * @param bolder 是否加粗
 */
export function colorful(content: string, colorName?: Colors, bolder = false): string {
  const colorStyle = colorName ? `color: ${colors[colorName]};` : ''
  const bolderStyle = bolder ? 'font-weight: bolder;' : ''

  return `<text style="${[colorStyle, bolderStyle].join(' ')}">${content}</text>`
}

/**
 * 生成控制台链接
 * @param content 要显示的内容
 * @param url 要跳转到的 url
 * @param newTab 是否在新标签页打开
 */
export function createLink(content: string, url: string, newTab = true): string {
  return `<a href="${url}" target="${newTab ? '_blank' : '_self'}">${content}</a>`
}

/**
 * 给房间内添加跳转链接
 *
 * @param roomName 添加调整链接的房间名
 * @returns 打印在控制台上后可以点击跳转的房间名
 */
export function createRoomLink(roomName: string): string {
  // https://screeps.com/a/#!/room/shard3/E21N0
  // https://screeps.com/a/#!/room/shard3/%5Broom%20E21N0%5D
  return createLink(roomName, `https://screeps.com/a/#!/room/${Game.shard.name}/${roomName}`, false)
}

/**
 * 快捷生成单个常量帮助
 *
 * @param name 常量简称
 * @param constant 常量名
 */
export function createConst(name: string, constant: string): string {
  return `${colorful(name, 'green')} ${colorful(constant, 'blue')}`
}

/**
 * 全局日志
 *
 * @param content 日志内容
 * @param prefixes 前缀中包含的内容
 * @param color 日志前缀颜色
 * @param notify 是否发送邮件
 */
export function log(content: string, prefixes: string[] = [], color?: Colors, notify = false): OK {
  // 有前缀就组装在一起
  let prefix = prefixes.length > 0 ? `【${prefixes.join(' ')}】 ` : ''
  // 指定了颜色
  prefix = colorful(prefix, color, true)

  const logContent = `${prefix}${content}`
  console.log(logContent)
  // 转发到邮箱
  if (notify)
    Game.notify(logContent)

  return OK
}

/**
 * 创建发送函数到控制台的调用链
 *
 * @see https://screeps.slack.com/files/U5GS01HT8/FJGTY8VQE/console_button.php
 * @param command 要在游戏控制台执行的方法
 */
function sendCommandToConsole(command: string): string {
  return `angular.element(document.body).injector().get('Console').sendCommand('(${command})()', 1)`
}

/**
 * 在控制台中创建 HTML 元素的方法集合
 */
export const createElement = {
  customStyle: () => {
    const style = `<style>
          input {
              background-color: #2b2b2b;
              border: none;
              border-bottom: 1px solid #888;
              padding: 3px;
              color: #ccc;
          }
          select {
              border: none;
              background-color: #2b2b2b;
              color: #ccc;
          }
          button {
              border: 1px solid #888;
              cursor: pointer;
              background-color: #2b2b2b;
              color: #ccc;
          }
      </style>`

    return style.replace(/\n/g, '')
  },

  /**
   * 创建 input 输入框
   * @param detail 创建需要的信息
   */
  input(detail: InputDetail): string {
    return `${detail.label || ''} <input name="${detail.name}" placeholder="${detail.placeholder || ''}"/>`
  },

  /**
   * 创建 select 下拉框
   * @param detail 创建需要的信息
   */
  select(detail: SelectDetail): string {
    const parts = [`${detail.label || ''} <select name="${detail.name}">`]
    parts.push(...detail.options.map(option => ` <option value="${option.value}">${option.label}</option>`))
    parts.push('</select>')

    return parts.join('')
  },

  /**
   * 创建按钮
   * 按钮绑定的命令会在点击后发送至游戏控制台
   * @param detail 创建需要的信息
   */
  button(detail: ButtonDetail): string {
    return `<button onclick="${sendCommandToConsole(detail.command)}">${detail.content}</button>`
  },

  /**
   * 创建表单
   * @param name 表单的名称
   * @param details 表单元素列表
   * @param buttonDetail 按钮的信息
   */
  form(name: string, details: HTMLElementDetail[], buttonDetail: ButtonDetail): string {
    // 创建唯一的表单名
    const formName = name + Game.time.toString()

    // 添加样式和表单前标签
    const parts = [this.customStyle(), `<form name='${formName}'>`]

    // 添加表单内容
    parts.push(
      // eslint-disable-next-line array-callback-return
      ...details.map((detail) => {
        switch (detail.type) {
          case 'input':
            return `${this.input(detail)}    `
          case 'select':
            return `${this.select(detail)}    `
        }
      }),
    )

    /**
     * 封装表单内容获取方法
     * 注意后面的 \`(${buttonDetail.command})(\${JSON.stringify(formDatas)\})\`
     * 这里之所以用 \ 把 ` 和 $ 转义了是因为要生成一个按钮点击时才会用到的模板字符串，通过这个方法来把表单的内容f=当做参数提供给 sendCommand 里要执行的方法
     * 如果直接填 formDatas 而不是 JSON.stringify(formDatas) 的话，会报错找不到 formdatas
     */
    const commandWarp = `(() => {
          const form = document.forms['${formName}']
          let formDatas = {}
          [${details.map(detail => `'${detail.name}'`).toString()}].map(eleName => formDatas[eleName] = form[eleName].value)
          angular.element(document.body).injector().get('Console').sendCommand(\`(${buttonDetail.command})(\${JSON.stringify(formDatas)\})\`, 1)
      })()`
    // 添加提交按钮
    parts.push(`<button type="button" onclick="${commandWarp.replace(/\n/g, ';')}">${buttonDetail.content}</button>`)
    parts.push('</form>')

    // 压缩成一行
    return parts.join('')
  },
}
