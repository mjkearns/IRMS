const getFeatureLocation = (data, featureName) => {
  const found = data.features.filter((feature) => {
    return feature.properties.targets.match(featureName)
  })
  if (found.length === 0) {
    throw Error('No features found for feature name ' + featureName)
  } else if (found.length > 1) {
    throw Error('Multiple features found for feature name ' + featureName)
  } else {
    const location = { x: 0, y: 0 }
    location.x = found[0].geometry.coordinates[0]
    location.y = found[0].geometry.coordinates[1]
    return location
  }
}
exports.getFeatureLocation = getFeatureLocation

const calculateOffsetAngle = (data) => {
  const bank1 = data.features.filter((feature) => {
    return feature.properties.targets.match(/^L[0-9]+B1$/i)
  })
  const extents = bank1.filter((feature, index) => {
    return index === 0 || index === bank1.length - 1
  })
  if (extents.length !== 2) {
    throw Error('Wrong number of elements in extents, found ' + extents.length)
  }
  const originX = extents[0].geometry.coordinates[0]
  const originY = extents[0].geometry.coordinates[1]
  const destX = extents[1].geometry.coordinates[0]
  const destY = extents[1].geometry.coordinates[1]
  const offsetX = destX - originX
  const offsetY = destY - originY
  const distance = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2))
  return _radiansToDegrees(Math.asin(offsetY / distance))
}
exports.calculateOffsetAngle = calculateOffsetAngle

const calculateShotAdjustment = (shotX, angle) => {
  const adjustment = { x: 0, y: 0 }
  adjustment.x = shotX * Math.sin(_degreesToRadians(90 - angle))
  adjustment.y = 0 - shotX * Math.sin(_degreesToRadians(angle))
  return adjustment
}
exports.calculateShotAdjustment = calculateShotAdjustment

function _degreesToRadians(degrees) {
  return degrees * (Math.PI / 180)
}

function _radiansToDegrees(radians) {
  return radians * (180 / Math.PI)
}
