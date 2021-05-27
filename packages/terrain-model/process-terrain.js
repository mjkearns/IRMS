class TerrainGrid {
  constructor(model, settings = {}) {
    this.settings = this.processSettings(model, settings)
    this.model = this.processModel(model)
  }

  processSettings(model, settings) {
    let result = (model && model.settings) || {}
    return Object.assign(
      {
        zeroElevations: true,
        laneWidth: 5,
        extrapolateWidth: 0
      },
      result,
      settings
    )
  }

  processModel(model) {
    let result = false
    if (this.validateModel(model)) {
      result = this.processReferences(model)
      let bounds = this.determineBounds(result)
      if (this.settings.zeroElevations) {
        result = this.zeroElevations(result, bounds)
      }
      result = this.interpolate(result, bounds)
      if (this.settings.extrapolateWidth) {
        result = this.extrapolateWidth(result, this.settings.extrapolateWidth)
      }
    }
    return result
  }

  validateModel(model) {
    if (typeof model !== 'object') {
      return false
    }

    let entries = 0
    let references = this.compileReferenceMap(model)
    for (let key in model) {
      if (key !== 'settings') {
        entries++
        if (!this._validateModelEntry(references, model[key])) {
          return false
        }
      }
    }

    return entries > 0
  }

  _validateModelEntry(references, entry) {
    if (typeof entry === 'object') {
      if (
        entry.hasOwnProperty('distance') &&
        typeof entry.distance === 'number'
      ) {
        if (
          entry.hasOwnProperty('elevations') &&
          Array.isArray(entry.elevations)
        ) {
          return true
        } else if (
          entry.hasOwnProperty('reference') &&
          typeof entry.reference === 'string' &&
          references.hasOwnProperty(entry.reference)
        ) {
          return true
        }
      }
    }
    return false
  }

  processReferences(model) {
    let result = {}
    let references = this.compileReferenceMap(model)
    for (let key in model) {
      let entry = model[key]
      if (key === 'settings') {
        result[key] = entry
      } else {
        if (entry.hasOwnProperty('reference')) {
          result[key] = this.processReference(references, entry)
        } else {
          result[key] = this.copyEntry(entry)
        }
      }
    }
    return result
  }

  compileReferenceMap(model) {
    let result = {}
    for (let key in model) {
      let entry = model[key]
      result[entry.label || key] = entry
    }
    return result
  }

  processReference(references, entry) {
    let reference = references[entry.reference]
    let adjustedElevations = reference.elevations.map((value) => {
      return value + (entry.adjustment || 0)
    })
    return {
      distance: entry.distance,
      elevations: adjustedElevations
    }
  }

  copyEntry(entry) {
    return {
      distance: entry.distance,
      elevations: [...entry.elevations]
    }
  }

  determineBounds(model) {
    let result = {
      lanes: null,
      laneWidth: this.settings.laneWidth,
      elevation: {
        max: null,
        min: null
      },
      distance: {
        min: null,
        max: null
      }
    }

    let distances = []
    for (let key in model) {
      let entry = model[key]

      if (key !== 'settings') {
        result.lanes =
          result.lanes === null
            ? entry.elevations.length
            : Math.max(entry.elevations.length, result.lanes)

        result.elevation.min =
          result.elevation.min === null
            ? Math.min(...entry.elevations)
            : Math.min(...entry.elevations, result.elevation.min)
        result.elevation.max =
          result.elevation.max === null
            ? Math.max(...entry.elevations)
            : Math.max(...entry.elevations, result.elevation.max)

        result.distance.min =
          result.distance.min === null
            ? entry.distance
            : Math.min(result.distance.min, entry.distance)
        result.distance.max =
          result.distance.max === null
            ? entry.distance
            : Math.max(result.distance.max, entry.distance)

        distances.push(entry.distance)
      }
    }
    result.distances = distances.sort((a, b) => a - b)
    return result
  }

  zeroElevations(model, bounds) {
    bounds = bounds || this.determineBounds(model)
    let elevationAdjustment = -bounds.elevation.min
    return this.adjustElevations(model, elevationAdjustment)
  }

  adjustElevations(model, adjustment = 0) {
    let result = {}
    for (let key in model) {
      if (key !== 'settings') {
        let entry = model[key]
        result[key] = {
          label: entry.label,
          distance: entry.distance,
          elevations: entry.elevations.map((element) => element + adjustment)
        }
      }
    }
    return result
  }

  interpolate(model, bounds) {
    let interpolatedModel = this.interpolateLength(model, bounds)
    interpolatedModel = this.interpolateWidth(interpolatedModel, bounds)
    return interpolatedModel
  }

  interpolateLength(model, bounds) {
    let result = {}
    for (let index = 0; index < bounds.distances.length; ++index) {
      let distance = bounds.distances[index]
      let nextDistance = bounds.distances[index + 1] || distance
      let entry = model[distance]
      let nextEntry = model[nextDistance]

      let span = nextDistance - distance
      result[distance] = entry
      for (let position = 1; position <= span; ++position) {
        let factor = position / span
        let interpolatedDistance = distance + position
        result[interpolatedDistance] = {
          label: 'interpolated-' + interpolatedDistance,
          distance: interpolatedDistance,
          elevations: this.interpolateBetweenDistances(factor, entry, nextEntry)
        }
      }
    }
    return result
  }

  interpolateBetweenDistances(factor, firstEntry, nextEntry) {
    let elevations = []
    for (let index = 0; index < firstEntry.elevations.length; ++index) {
      let firstElevation = firstEntry.elevations[index]
      let nextElevation =
        index < nextEntry.elevations.length
          ? nextEntry.elevations[index]
          : firstElevation
      let interpolatedElevation = this.valueBetween(
        factor,
        firstElevation,
        nextElevation
      )
      elevations.push(interpolatedElevation)
    }
    return elevations
  }

  interpolateWidth(model, bounds) {
    let result = {}
    let laneSpacing = bounds.laneWidth
    for (let key in model) {
      if (key !== 'settings') {
        let entry = model[key]
        result[key] = {
          label: entry.label,
          distance: entry.distance,
          elevations: this.interpolateBetweenLanes(
            laneSpacing,
            entry.elevations
          )
        }
      }
    }
    return result
  }

  interpolateBetweenLanes(spacing, elevations) {
    let result = [elevations[0]]
    for (let index = 1; index < elevations.length; ++index) {
      let firstElevation = elevations[index - 1]
      let nextElevation = elevations[index]
      for (let laneOffset = 1; laneOffset < spacing; ++laneOffset) {
        let factor = laneOffset / (spacing - 1)
        let interpolatedElevation = this.valueBetween(
          factor,
          firstElevation,
          nextElevation
        )
        result.push(interpolatedElevation)
      }
    }
    return result
  }

  extrapolateWidth(model, width) {
    let result = {}
    for (let key in model) {
      let entry = model[key]
      if (entry.hasOwnProperty('elevations')) {
        let pre = Array.from(Array(width), () => entry.elevations[0])
        let post = Array.from(
          Array(width),
          () => entry.elevations[entry.elevations.length - 1]
        )
        result[key] = {
          label: entry.label,
          distance: entry.distance,
          elevations: [].concat.apply([], [pre, entry.elevations, post])
        }
      }
    }
    return result
  }

  buildArray(model) {
    let result = []
    for (let key in model) {
      let entry = model[key]
      let distance = entry.distance
      result[distance] = [...entry.elevations]
    }
    return result
  }

  buildString(model) {
    let result = ''
    let array = this.buildArray(model)
    for (let distanceIndex = 0; distanceIndex < array.length; distanceIndex++) {
      let section = array[distanceIndex]
      result += section.map((value) => value.toFixed(2)).join(' ') + '\n'
    }
    return result
  }

  generateSvg(model) {
    let bounds = this.determineBounds(model)
    let elevationScale = bounds.elevation.max - bounds.elevation.min

    let svg = `<svg width="${bounds.lanes}" height="${bounds.distances.length}">`
    for (let key in model) {
      let entry = model[key]
      entry.elevations.forEach((elevation, index) => {
        let factor = (elevation - bounds.elevation.min) / elevationScale
        let color = Math.floor(factor * 255)
        let fill = `rgb(${color}, ${color}, ${color})`
        svg += `<rect width="1" height="1" x="${index}" y="${entry.distance}" style="fill:${fill};stroke:none;" />`
      })
    }
    svg += `</svg>`
    return svg
  }

  valueBetween(factor, valueA, valueB) {
    return valueA * (1 - factor) + valueB * factor
  }
}

module.exports = TerrainGrid
