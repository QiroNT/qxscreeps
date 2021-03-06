import actionExtension from './control/action'
import staticExtension from './static/static'
import behaviourExtension from './control/behaviour'
import frameExtension from './control/frame'

// 定义好挂载顺序
const plugins = [
  frameExtension,
  actionExtension,
  staticExtension,
  behaviourExtension,
]

/**
* 依次挂载所有的拓展
*/
export default () => plugins.forEach(plugin => Object.assign(global, plugin))
