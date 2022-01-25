/* errormap */
import { ErrorMapper } from './_errorMap/errorMapper'
import { MemoryInit } from './module/global/init'
/* 原型挂载 */
import Mount from '@/mount'
import RoomWork from '@/boot/roomWork'
import CreepWork from '@/boot/creepWork'
import { CreepNumStatistic } from './module/global/statistic'
import { pixel } from './module/fun/pixel'
/**
 * 主运行函数
 */
export const loop = ErrorMapper.wrapLoop(() =>{
    let cpu1 = Game.cpu.getUsed()
    /* Memory初始化 */
    MemoryInit()
    /* 原型拓展挂载 */
    Mount()
    let cpu2 = Game.cpu.getUsed()
    /* 爬虫统计及死亡Memory回收 */
    CreepNumStatistic()
    /* 房间框架运行 */
    RoomWork()
    let cpu3 = Game.cpu.getUsed()
    /* 爬虫运行 */
    CreepWork()
    let cpu4 = Game.cpu.getUsed()
    /* 像素 */
    pixel()
    // console.log(`cpu消耗统计:\n初始化及原型挂载:${cpu2-cpu1}\n房间框架运行:${cpu3-cpu2}\n爬虫运行:${cpu4-cpu3}\n总cpu:${cpu4}`)
})
