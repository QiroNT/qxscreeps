/**
 * 功能相关声明
 */
interface Creep{
    workstate(rType:ResourceConstant):void
    harvest_(source_:Source):void
    transfer_(distination:Structure,rType:ResourceConstant) : void
    upgrade_():void
    build_(distination:ConstructionSite) : void
    repair_(distination:Structure) : void
    withdraw_(distination:Structure,rType:ResourceConstant) : void
}