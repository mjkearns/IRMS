const fs = require('fs')
const geotiff = require('../services/geotiff')

function loadDEM(DEMname) {
  return new Promise((resolve, reject) => {
    fs.readFile('./__test__/data/' + DEMname, null, async (error, data) => {
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
    expect.assertions(3)
    expect(
      geotiff.getHeight(majuraDEM, 701770.3174384605, 6096810.844646253)
    ).toEqual(643.438)
    expect(
      geotiff.getHeight(majuraDEM, 701774.8637818306, 6096710.283639116)
    ).toEqual(638.748)
    expect(geotiff.getHeight(majuraDEM, 701630.053, 6096130.042)).toEqual(
      623.746
    )
  })
})
