const fs = require('fs')
const shot = require('./process-shot')
const features = require('./features')
const geotiff = require('./geotiff')
// const LeadDatabase = require('./lead-database')
// const Settings = require('./settings')
const MessageSystem = require('@ats-irms/message-system-rabbitmq')

const rabbitMQHost = 'localhost:5672'

const DEMs = []
const geoJSONs = []

function loadGeoJSON(GeoJSONName) {
  return new Promise((resolve, reject) => {
    fs.readFile('./' + GeoJSONName, null, (error, data) => {
      if (error) {
        reject(error)
      } else {
        const geojson = JSON.parse(data)
        resolve({ name: GeoJSONName, data: geojson })
      }
    })
  })
}

function loadDEM(DEMname) {
  return new Promise((resolve, reject) => {
    fs.readFile('./' + DEMname, null, async (error, data) => {
      if (error) {
        reject(error)
      } else {
        await geotiff.getTiffFromBuffer(data.buffer, (error, tiffdata) => {
          if (error) {
            reject(error)
          } else {
            resolve({ name: DEMname, data: tiffdata })
          }
        })
      }
    })
  })
}

async function loadData() {
  await loadDEM('majura_mtr_dem_1m_v2')
    .then((DEM) => DEMs.push(DEM))
    .catch((error) => {
      console.log(error)
    })
  await loadGeoJSON('targets_test.geojson')
    .then((geoJSON) => geoJSONs.push(geoJSON))
    .catch((error) => {
      console.log(error)
    })
}

async function doIt2() {
  let majuraDEM = null
  let majuraGeoJSON = null

  await loadData()

  const foundDEMs = DEMs.filter((DEM) => {
    return DEM.name === 'majura_mtr_dem_1m_v2'
  })
  if (foundDEMs.length === 0) {
    throw new Error('DEM not found')
  } else {
    majuraDEM = foundDEMs[0].data
  }

  const foundGeoJSONs = geoJSONs.filter((geoJSON) => {
    return geoJSON.name === 'targets_test.geojson'
  })
  if (foundGeoJSONs.length === 0) {
    throw new Error('GeoJSON not found')
  } else {
    majuraGeoJSON = foundGeoJSONs[0].data
  }

  const firingPoint = features.getFeatureLocation(majuraGeoJSON, 'L1FP0')
  const L1B1 = features.getFeatureLocation(majuraGeoJSON, 'L1B1')

  await geotiff
    .getHeight(majuraDEM, firingPoint.x, firingPoint.y)
    .then((result) => (firingPoint.z = result))
    .catch((error) => console.log(error))
  await geotiff
    .getHeight(majuraDEM, L1B1.x, L1B1.y)
    .then((result) => (L1B1.z = result))
    .catch((error) => console.log(error))
  console.log(firingPoint)

  const adjustmentAngle = features.calculateOffsetAngle(majuraGeoJSON)

  // target shot x is horizontal, z is vertical, y should always be zero
  const targetShot = { x: -0.3, y: 0, z: 0.3 }

  const shotAdjustment = features.calculateShotAdjustment(
    targetShot.x,
    adjustmentAngle
  )
  const geoShot = {
    x: L1B1.x + shotAdjustment.x,
    y: L1B1.y + shotAdjustment.y,
    z: L1B1.z + targetShot.z
  }
  console.log(geoShot)

  for (let offsetDistance = 1; offsetDistance < 100; offsetDistance++) {
    const offsetShot = shot.calculateOffsetPoint(
      firingPoint,
      geoShot,
      offsetDistance
    )
    const groundHeight = await geotiff.getHeight(
      majuraDEM,
      offsetShot.x,
      offsetShot.y
    )
    console.log(
      offsetShot.x +
        ', ' +
        offsetShot.y +
        ' - ' +
        offsetShot.z +
        ' > ' +
        groundHeight
    )
    if (offsetShot.z <= groundHeight) {
      console.log('hit the ground at ' + offsetDistance + 'm!')
      break
    }
  }
}

async function startMessageSystem() {
  const system = await new MessageSystem(rabbitMQHost)
  const pipeId = null

  if (!system.connected()) {
    console.log('failed to connect to rabbit')
    return
  }
  system
    .subscribe(pipeId, 'shots', 'shot.importer.batch', handleMessage)
    .then(() => console.log('subscribed'))
}

function handleMessage(message, fields, properties) {
  try {
    console.log('Received: ' + message.batch.length)
    const shots = message.batch
    shots.forEach((shot) => {
      console.log(shot.x + ' ' + shot.y)
      handleShot(shot)
    })
  } catch (error) {
    console.log(error)
  }
}

function handleShot(shotdata) {
  console.log(shotdata)
}

startMessageSystem()

doIt2()
