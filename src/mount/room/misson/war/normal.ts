import { GenerateAbility } from "@/utils"

/* 房间原型拓展   --任务  --常规战争 */
export default class NormalWarExtension extends Room {
    // 拆迁黄球
    public Task_dismantle(mission:MissionModel):void{
        if ((Game.time - global.Gtime[this.name]) % 10) return
        if (mission.Data.boost)
        {
            // 体型
            global.SpecialBodyData[this.name]['dismantle'] = GenerateAbility(40,0,10,0,0,0,0,0)
            // boost lab填充检查
            if(!this.Check_Lab(mission,'transport','complex')) return
        }
        /* 数量投放 */
        if (mission.CreepBind['dismantle'].num == 0)
        mission.CreepBind['dismantle'].num = mission.Data.num
    }

    // 一体机
    public Task_aio(mission:MissionModel):void{
        if (mission.Data.boost)
        {
            // 体型
            global.SpecialBodyData[this.name]['aio'] = GenerateAbility(0,0,10,0,6,23,0,11)
            if ((Game.time - global.Gtime[this.name]) % 10) return
            // boost lab填充检查
            if(!this.Check_Lab(mission,'transport','complex')) return
        }
        else
        {
            if ((Game.time - global.Gtime[this.name]) % 10) return
        }
        if (mission.CreepBind['aio'].num == 0)
        mission.CreepBind['aio'].num = mission.Data.num
    }
}