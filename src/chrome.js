import os from 'os'
import path from 'path'
import sp from 'child_process'
import got from 'got'
import config from './config'
import { log, psLookup, psKill } from './utils'

const CHROME_PATH = process.env.CHROME_PATH && path.resolve(process.env.CHROME_PATH)
const HEADLESS_URL = 'http://127.0.0.1:9222'
const PROCESS_STARTUP_TIMEOUT = 1000 * 5

export async function isChromeRunning () {
  let running = false

  console.log('ls /tmp', sp.execSync('ls -lhtra /tmp').toString())

  // TODO: we can't rely on ps on lambda? look for /tmp/.chrome.blah file instead?
  try {
    const matches = await psLookup({ command: 'headless_shell' })
    running = !!matches.length
  } catch (error) {
    running = false
  }

  return running
}

// TODO: refactor this cuz there's some dumb dumb in here.
function waitUntilProcessIsReady (startTime = Date.now(), parentResolve = () => {}) {
  return new Promise(async (resolve) => {
    if (Date.now() - startTime < PROCESS_STARTUP_TIMEOUT) {
      await got(`${HEADLESS_URL}/json`)
        .then(() => {
          resolve()
          parentResolve()
        })
        .catch(async () => {
          await waitUntilProcessIsReady(startTime, resolve)
        })
    } else {
      resolve()
    }
  })
}

export async function spawn () {
  console.log('CHROME_PATH', CHROME_PATH)
  if (CHROME_PATH) {
    // TODO: add a timeout for reject() in case, for whatever reason, chrome doesn't start after a certain period
    return new Promise(async (resolve, reject) => {
      const isRunning = await isChromeRunning()
      log('Is Chrome already running?', isRunning)

      if (!isRunning) {
        const chrome = sp.spawn(
          CHROME_PATH,
          [...config.chromeFlags, '--remote-debugging-port=9222'],
          {
            cwd: os.tmpdir(),
            shell: true,
            detached: true,
            stdio: 'ignore',
          },
        )

        /*
        chrome.on('error', (error) => {
          log('Failed to start chrome process.', error)
          reject()
        })

        chrome.stdout.on('data', (data) => {
          log(`chrome stdout: ${data}`)
        })

        chrome.stderr.on('data', (data) => {
          log(`chrome stderr: ${data}`)
        }) */

        chrome.unref()

        waitUntilProcessIsReady(Date.now(), resolve)
      }
    })
  }
}

export async function kill () {
  const isRunning = await isChromeRunning()

  if (isRunning) await psKill({ command: 'headless_shell' })
}