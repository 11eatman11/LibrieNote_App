import { smartNetworkManager } from '@/services/smartNetworkManager'

export default ({ store, app }, inject) => {
  inject('smartNetwork', smartNetworkManager)

  if (process.client) {
    setTimeout(() => {
      smartNetworkManager.startMonitoring(store, app.$eventBus)
    }, 1000)
  }
}
