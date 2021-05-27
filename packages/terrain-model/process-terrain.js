class TerrainGrid {
  constructor(model, settings = {}) {
    this.settings = this.processSettings(model, settings)
    this.model = this.processModel(model)
  }

  processSettings(model, settings) {
    const result = (model && model.settings) || {}
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
      const bounds = this.determineBounds(result)
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
    const references = this.compileReferenceMap(model)
    for (const key in model) {
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
        Object.prototype.hasOwnProperty.call(entry, 'distance') &&
        typeof entry.distance === 'number'
      ) {
        if (
          Object.prototype.hasOwnProperty.call(entry, 'elevations') &&
          Array.isArray(entry.elevations)
        ) {
          return true
        } else if (
          Object.prototype.hasOwnProperty.call(entry, 'reference') &&
          typeof entry.reference === 'string' &&
          Object.prototype.hasOwnProperty.call(references, entry.reference)
        ) {
          return true
        }
      }
    }
    return false
  }

  processReferences(model) {
    const result = {}
    const references = this.compileReferenceMap(model)
    for (const key in model) {
      const entry = model[key]
      if (key === 'settings') {
        result[key] = entry
      } else {
        if (Object.prototype.hasOwnProperty.call(entry, 'reference')) {
          result[key] = this.processReference(references, entry)
        } else {
          result[key] = this.copyEntry(entry)
        }
      }
    }
    return result
  }

  compileReferenceMap(model) {
    const result = {}
    for (const key in model) {
      const entry = model[key]
      result[entry.label || key] = entry
    }
    return result
  }

  processReference(references, entry) {
    const reference = references[entry.reference]
    const adjustedElevations = reference.elevations.map((value) => {
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
    const result = {
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

    const distances = []
    for (const key in model) {
      const entry = model[key]

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
    const elevationAdjustment = -bounds.elevation.min
    return this.adjustElevations(model, elevationAdjustment)
  }

  adjustElevations(model, adjustment = 0) {
    const result = {}
    for (const key in model) {
      if (key !== 'settings') {
        const entry = model[key]
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
    const result = {}
    for (let index = 0; index < bounds.distances.length; ++index) {
      const distance = bounds.distances[index]
      const nextDistance = bounds.distances[index + 1] || distance
      const entry = model[distance]
      const nextEntry = model[nextDistance]

      const span = nextDistance - distance
      result[distance] = entry
      for (let position = 1; position <= span; ++position) {
        const factor = position / span
        const interpolatedDistance = distance + position
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
    const elevations = []
    for (let index = 0; index < firstEntry.elevations.length; ++index) {
      const firstElevation = firstEntry.elevations[index]
      const nextElevation =
        index < nextEntry.elevations.length
          ? nextEntry.elevations[index]
          : firstElevation
      const interpolatedElevation = this.valueBetween(
        factor,
        firstElevation,
        nextElevation
      )
      elevations.push(interpolatedElevation)
    }
    return elevations
  }

  interpolateWidth(model, bounds) {
    const result = {}
    const laneSpacing = bounds.laneWidth
    for (const key in model) {
      if (key !== 'settings') {
        const entry = model[key]
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
    const result = [elevations[0]]
    for (let index = 1; index < elevations.length; ++index) {
      const firstElevation = elevations[index - 1]
      const nextElevation = elevations[index]
      for (let laneOffset = 1; laneOffset < spacing; ++laneOffset) {
        const factor = laneOffset / (spacing - 1)
        const interpolatedElevation = this.valueBetween(
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
    const result = {}
    for (const key in model) {
      const entry = model[key]
      if (Object.prototype.hasOwnProperty.call(entry, 'elevations')) {
        const pre = Array.from(Array(width), () => entry.elevations[0])
        const post = Array.from(
          Array(width),
          () => entry.elevations[entry.elevations.length - 1]
        )
        result[key] = {
          label: entry.label,
          distance: entry.distance,
          elevations: [].concat(pre, entry.elevations, post)
        }
      }
    }
    return result
  }

  buildArray(model) {
    const result = []
    for (const key in model) {
      const entry = model[key]
      const distance = entry.distance
      result[distance] = [...entry.elevations]
    }
    return result
  }

  buildString(model) {
    let result = ''
    const array = this.buildArray(model)
    for (let distanceIndex = 0; distanceIndex < array.length; distanceIndex++) {
      const section = array[distanceIndex]
      result += section.map((value) => value.toFixed(2)).join(' ') + '\n'
    }
    return result
  }

  generateSvg(model) {
    const bounds = this.determineBounds(model)
    const elevationScale = bounds.elevation.max - bounds.elevation.min

    let svg = `<svg width="${bounds.lanes}" height="${bounds.distances.length}">`
    for (const key in model) {
      const entry = model[key]
      entry.elevations.forEach((elevation, index) => {
        const factor = (elevation - bounds.elevation.min) / elevationScale
        const color = Math.floor(factor * 255)
        const fill = `rgb(${color}, ${color}, ${color})`
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
