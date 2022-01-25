/* [通用]房间运行主程序 */
export default ()=>{

    if (!Memory.RoomControlData) Memory.RoomControlData = {}
    for (var roomName in Memory.RoomControlData)
    {
        let thisRoom = Game.rooms[roomName]
        if (!thisRoom) continue
        /* 具体房间逻辑 */
        thisRoom.RoomInit()         // 房间数据初始化
        thisRoom.RoomEcosphere()    // 房间状态、布局
        thisRoom.SpawnMain()        // 定时、补员型孵化管理

        /* 任务管理器 */
        thisRoom.MissionManager()   // 任务管理器

        thisRoom.SpawnExecution()   // 孵化爬虫

        thisRoom.TowerWork()        // 防御塔工作

        thisRoom.structureMission(['terminal','link','factory'])    // 终端、链接、工厂等建筑执行任务
        
        // 房间等级Memory信息更新
        if (thisRoom.controller.level > thisRoom.memory.originLevel)
            thisRoom.memory.originLevel = thisRoom.controller.level
    }
}