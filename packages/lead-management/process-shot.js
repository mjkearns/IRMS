const calculateOffsetPoint = (originPoint, shotPoint, distanceOffset) => {
  const offsetPoint = { x: 0, y: 0, z: 0 }
  const xChange = originPoint.x - shotPoint.x
  const yChange = originPoint.y - shotPoint.y
  const zChange = originPoint.z - shotPoint.z

  const xyAngle = Math.atan(xChange / yChange)

  const xyDistance = xChange / Math.sin(xyAngle)

  const zDistance = Math.sqrt(Math.pow(xyDistance, 2) + Math.pow(zChange, 2))
  const zAngle = Math.acos(xyDistance / zDistance)

  const newDistance = xyDistance + distanceOffset

  offsetPoint.x = originPoint.x - newDistance * Math.sin(xyAngle)
  offsetPoint.y = originPoint.y - newDistance * Math.cos(xyAngle)
  offsetPoint.z = originPoint.z - newDistance * Math.tan(zAngle)

  return offsetPoint
}
exports.calculateOffsetPoint = calculateOffsetPoint
