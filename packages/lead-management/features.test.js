const fs = require('fs')
const features = require('./features')

const targetShot = { x: -0.3, y: 0, z: 0.3 }

function loadGeoJSON(GeoJSONName) {
  return new Promise((resolve, reject) => {
    fs.readFile('./' + GeoJSONName, null, (error, data) => {
      if (error) {
        reject(error)
      } else {
        const geojson = JSON.parse(data)
        resolve(geojson)
      }
    })
  })
}

describe('', () => {
  let majuraGeoJSON
  let firingPoint
  let L1B1
  let adjustmentAngle
  let shotAdjustment

  it('majura geoJSON loaded', async () => {
    await loadGeoJSON('targets_test.geojson')
      .then((geoJSON) => {
        majuraGeoJSON = geoJSON
      })
      .catch((error) => {
        console.log(error)
      })
    expect(majuraGeoJSON).toBeDefined()
  })

  it('get feature locations', () => {
    firingPoint = features.getFeatureLocation(majuraGeoJSON, 'L1FP0')
    L1B1 = features.getFeatureLocation(majuraGeoJSON, 'L1B1')

    expect(firingPoint).toBeDefined()
    expect(L1B1).toBeDefined()
  })

  it('check feature location x and y', () => {
    expect(firingPoint.x).toEqual(701770.3174384605)
    expect(firingPoint.y).toEqual(6096810.844646253)

    expect(L1B1.x).toEqual(701775.1182531144)
    expect(L1B1.y).toEqual(6096711.297413771)
  })

  it('calculate offset angle', () => {
    adjustmentAngle = features.calculateOffsetAngle(majuraGeoJSON)
    expect(adjustmentAngle).toEqual(-2.826793732453496)
  })

  it('calculate shot adjustment', () => {
    shotAdjustment = features.calculateShotAdjustment(
      targetShot.x,
      adjustmentAngle
    )
    expect(shotAdjustment.x).toEqual(-0.2996349552238745)
    expect(shotAdjustment.y).toEqual(-0.0147950534972573)
  })
})
