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

async function doIt() {
  let majuraDEM
  await loadDEM('majura_mtr_dem_1m_v2')
    .then((DEM) => {
      majuraDEM = DEM
    })
    .catch((error) => {
      console.log(error)
    })
  console.log(majuraDEM !== undefined)
}

doIt()
