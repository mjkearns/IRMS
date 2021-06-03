const geotiff = require('geotiff')

class GeoTIFFData {
  constructor(tiffdata) {
    this.image = null
    this.origin = null
    this.rasterData = null
    this.width = null
    this.height = null
    this.length = null
    this._tiffdata = tiffdata
  }

  async initialise() {
    console.log('initialising')
    this.image = await this._tiffdata.getImage()
    console.log('got image OK')
    this.origin = this.image.getOrigin()
    this.rasterData = await this.image.readRasters()
    const { width, height, length } = this.rasterData
    this.width = width
    this.height = height
    this.length = length
    if (!length) {
      throw new Error('no raster data found')
    }
  }
}

const getTiffFromBuffer = async (dataBuffer, callback) => {
  try {
    const tiffdata = await geotiff.fromArrayBuffer(dataBuffer)
    console.log('got tiff data OK')
    const tiff = new GeoTIFFData(tiffdata)
    await tiff.initialise()
    if (callback && typeof callback === 'function') {
      callback(null, tiff)
    } else {
      return tiff
    }
  } catch (error) {
    console.log('tiff error')
    if (callback && typeof callback === 'function') {
      callback(error, null)
    } else {
      throw new Error(error)
    }
  }
}
exports.getTiffFromBuffer = getTiffFromBuffer

const getHeight = async (tiff, searchX, searchY) => {
  const offsetX = Math.floor(searchX) - tiff.origin[0]
  const offsetY = tiff.origin[1] - 1 - Math.floor(searchY)
  return tiff.rasterData[0][offsetY * tiff.width + offsetX]
}
exports.getHeight = getHeight
