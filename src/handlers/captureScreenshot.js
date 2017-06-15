import Cdp from 'chrome-remote-interface'
import config from '../config'
import {log, sleep} from '../utils'

export async function captureScreenshotOfUrl(url) {
  const LOAD_TIMEOUT = (config && config.chrome.pageLoadTimeout) || 1000 * 60

  let result
  let loaded = false

  const loading = async (startTime = Date.now()) => {
    if (!loaded && Date.now() - startTime < LOAD_TIMEOUT) {
      await sleep(100)
      await loading(startTime)
    }
  }

  const [tab] = await Cdp.List()
  const client = await Cdp({host: '127.0.0.1', target: tab})

  const {Network, Page} = client

  Network.requestWillBeSent((params) => {
    log('Chrome is sending request for:', params.request.url)
  })

  Page.loadEventFired(() => {
    loaded = true
  })

  if (config.logging) {
    Cdp.Version((err, info) => {
      console.log('CDP version info', err, info)
    })
  }

  try {
    await Promise.all([
      Network.enable(), // https://chromedevtools.github.io/debugger-protocol-viewer/tot/Network/#method-enable
      Page.enable(), // https://chromedevtools.github.io/debugger-protocol-viewer/tot/Page/#method-enable
    ])

    await Page.navigate({url}) // https://chromedevtools.github.io/debugger-protocol-viewer/tot/Page/#method-navigate
    await loading()

    // TODO: resize the chrome "window" so we capture the full height of the page
    const screenshot = await Page.captureScreenshot()
    result = screenshot.data
  } catch (error) {
    console.error(error)
  }

  /* try {
   log('trying to close tab', tab)
   await Cdp.Close({ id: tab })
   } catch (error) {
   log('unable to close tab', tab, error)
   }*/

  await client.close()

  return result
}

export default (async function captureScreenshotHandler(event) {
  const { url } = event
  let screenshot

  log('Processing screenshot capture for', url)

  try {
    screenshot = await captureScreenshotOfUrl(url)
    // TODO SAVE SCREENSHOT TO S3
  } catch (error) {
    console.error('Error capturing screenshot for', url, error)
    throw new Error('Unable to capture screenshot')
  }

  return {
    done: true,
  }
})
