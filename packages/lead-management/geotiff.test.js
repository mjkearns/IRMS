const fs = require('fs')
const geotiff = require('./geotiff')

function loadDEM(DEMname) {
  return new Promise((resolve, reject) => {
    fs.readFile('./' + DEMname, null, async (error, data) => {
      if (error) {
        reject(error)
      } else {
        const tiffdata = await geotiff.getTiffFromBuffer(data.buffer)
        resolve(tiffdata)
      }
    })
  })
}

describe('', () => {
  let majuraDEM

  it('majura DEM loaded', async () => {
    await loadDEM('majura_mtr_dem_1m_v2')
      .then((DEM) => {
        majuraDEM = DEM
      })
      .catch((error) => {
        console.log(error)
      })
    expect(majuraDEM).toBeDefined()
  })
  it('get location height', async () => {
    expect.assertions(4)
    geotiff
      .getHeight(majuraDEM, 701770.3174384605, 6096810.844646253)
      .then((height) => {
        expect(height).toEqual(643.438)
      })
    geotiff
      .getHeight(majuraDEM, 701774.8637818306, 6096710.283639116)
      .then((height) => {
        expect(height).toEqual(638.748)
      })
    geotiff.getHeight(majuraDEM, 701630.053, 6096130.042).then((height) => {
      expect(height).toEqual(623.746)
    })
    geotiff.getHeight(majuraDEM, 701886.99, 6096815.79).then((height) => {
      expect(height).toEqual(639.027)
    })
  })
})
