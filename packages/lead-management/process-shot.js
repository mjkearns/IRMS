class Shot {
  constructor(model) {
    this.model = this.processModel(model)
  }

  processModel(model) {
    let result = false
    if (this.validateModel(model)) {
      result = model
    }
    return result
  }

  validateModel(model) {
    if (typeof model !== 'object') {
      return false
    }
    return true
  }

  determineOriginPoint(model) {
    // absolute x,y,z of the firing point using the model's lane number
    const result = { x: 0, y: 0, z: 0 }
    return result
  }

  determineTargetPoint(model) {
    // absolute x,y,z of the target, using the model's lane and bank,
    // offset by the target location (bottom centre of the target)
    const result = { x: 0, y: 0, z: 0 }
    return result
  }

  determineZDistancePoint(originPoint, targetImpactPoint, zDistance) {
    // absolute x,y,z of where the shot landed for a given Z distance value
    const result = { x: 0, y: 0, z: 0 }

    const yDrop = originPoint.y - targetImpactPoint.y
    const xOffset = targetImpactPoint.x - originPoint.x

    const yHyp = Math.sqrt(
      Math.pow(targetImpactPoint.z, 2) + Math.pow(yDrop, 2)
    )
    const yAngle = Math.asin(yDrop / yHyp)
    const yOpposite = this._degreesToRadians(90) - yAngle

    const xHyp = Math.sqrt(
      Math.pow(targetImpactPoint.z, 2) + Math.pow(xOffset, 2)
    )
    const xAngle = Math.asin(xOffset / xHyp)
    const xOpposite = this._degreesToRadians(90) - xAngle

    result.x =
      (zDistance / Math.sin(xOpposite)) * Math.sin(xAngle) + originPoint.x
    result.y =
      originPoint.y - (zDistance / Math.sin(yOpposite)) * Math.sin(yAngle)
    result.z = 0

    return result
  }

  _degreesToRadians(degrees) {
    return degrees * (Math.PI / 180)
  }

  _radiansToDegrees(radians) {
    return radians * (180 / Math.PI)
  }
}

module.exports = Shot
