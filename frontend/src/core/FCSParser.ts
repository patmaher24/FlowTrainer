export type FCSParameter = {
  index: number
  name: string
  stain: string
  bits: number
  range: number
  exponent: string
  gain: string
}

export type FCSMetadata = {
  version: string
  textStart: number
  textEnd: number
  dataStart: number
  dataEnd: number
  keywords: Record<string, string>
  parameters: FCSParameter[]
  totalEvents: number
  parameterCount: number
  dataType: string
  byteOrder: string
}

export type FCSDataSet = {
  metadata: FCSMetadata
  channels: Record<string, number[]>
}

function parseOffset(
  text: string
): number {
  const value = Number(text.trim())

  if (!Number.isFinite(value)) {
    return 0
  }

  return value
}

function parseTextSegment(
  text: string
): Record<string, string> {
  if (text.length === 0) {
    return {}
  }

  const delimiter = text[0]

  if (!delimiter) {
    return {}
  }

  const parts = text
    .slice(1)
    .split(delimiter)

  const keywords: Record<string, string> = {}

  for (
    let index = 0;
    index + 1 < parts.length;
    index += 2
  ) {
    const key = parts[index]
    const value = parts[index + 1]

    if (!key) {
      continue
    }

    keywords[key] = value ?? ''
  }

  return keywords
}

function parseIntegerKeyword(
  keywords: Record<string, string>,
  key: string
): number {
  const value = Number(
    keywords[key] ?? '0'
  )

  if (!Number.isFinite(value)) {
    return 0
  }

  return value
}

function isLittleEndian(
  byteOrder: string
): boolean {
  return byteOrder === '1,2,3,4'
}

function getParameterLabel(
  parameter: FCSParameter
): string {
  if (parameter.stain.trim()) {
    return parameter.stain.trim()
  }

  if (parameter.name.trim()) {
    return parameter.name.trim()
  }

  return `P${parameter.index}`
}

function makeUniqueChannelName(
  desiredName: string,
  channels: Record<string, number[]>
): string {
  if (!(desiredName in channels)) {
    return desiredName
  }

  let suffix = 2

  while (
    `${desiredName}_${suffix}` in channels
  ) {
    suffix += 1
  }

  return `${desiredName}_${suffix}`
}

function resolveDataOffsets(
  keywords: Record<string, string>,
  headerDataStart: number,
  headerDataEnd: number
): {
  dataStart: number
  dataEnd: number
} {
  const textDataStart =
    Number(
      keywords['$BEGINDATA'] ?? '0'
    )

  const textDataEnd =
    Number(
      keywords['$ENDDATA'] ?? '0'
    )

  const dataStart =
    headerDataStart > 0
      ? headerDataStart
      : textDataStart

  const dataEnd =
    headerDataEnd > 0
      ? headerDataEnd
      : textDataEnd

  return {
    dataStart,
    dataEnd
  }
}

export function parseFCSMetadata(
  buffer: ArrayBuffer
): FCSMetadata {
  const bytes = new Uint8Array(buffer)
  const decoder = new TextDecoder('ascii')

  if (bytes.length < 58) {
    throw new Error(
      'The file is too small to contain a valid FCS header.'
    )
  }

  const rawVersion =
    decoder.decode(
      bytes.slice(0, 8)
    )

  const version =
    rawVersion
      .replace(/\0/g, '')
      .trim()

  console.log(
    'Raw FCS header:',
    JSON.stringify(rawVersion)
  )

  console.log(
    'Detected FCS version:',
    version
  )

  if (
    !/^FCS\d+\.\d+/.test(version)
  ) {
    throw new Error(
      `The selected file does not appear to be an FCS file. ` +
      `Header detected: ${JSON.stringify(rawVersion)}`
    )
  }

  const textStart = parseOffset(
    decoder.decode(
      bytes.slice(10, 18)
    )
  )

  const textEnd = parseOffset(
    decoder.decode(
      bytes.slice(18, 26)
    )
  )

  const headerDataStart = parseOffset(
    decoder.decode(
      bytes.slice(26, 34)
    )
  )

  const headerDataEnd = parseOffset(
    decoder.decode(
      bytes.slice(34, 42)
    )
  )

  if (
    textStart < 0 ||
    textEnd < textStart ||
    textEnd >= bytes.length
  ) {
    throw new Error(
      'The FCS TEXT segment offsets are invalid.'
    )
  }

  const textSegment =
    decoder.decode(
      bytes.slice(
        textStart,
        textEnd + 1
      )
    )

  const keywords =
    parseTextSegment(
      textSegment
    )

  const totalEvents =
    parseIntegerKeyword(
      keywords,
      '$TOT'
    )

  const parameterCount =
    parseIntegerKeyword(
      keywords,
      '$PAR'
    )

  const dataType =
    keywords['$DATATYPE'] ?? ''

  const byteOrder =
    keywords['$BYTEORD'] ?? ''

  const {
    dataStart,
    dataEnd
  } = resolveDataOffsets(
    keywords,
    headerDataStart,
    headerDataEnd
  )

  const parameters: FCSParameter[] = []

  for (
    let index = 1;
    index <= parameterCount;
    index += 1
  ) {
    const name =
      keywords[`$P${index}N`] ?? ''

    const stain =
      keywords[`$P${index}S`] ?? ''

    const bits =
      parseIntegerKeyword(
        keywords,
        `$P${index}B`
      )

    const range =
      parseIntegerKeyword(
        keywords,
        `$P${index}R`
      )

    const exponent =
      keywords[`$P${index}E`] ?? ''

    const gain =
      keywords[`$P${index}G`] ?? ''

    parameters.push({
      index,
      name,
      stain,
      bits,
      range,
      exponent,
      gain
    })
  }

  return {
    version,
    textStart,
    textEnd,
    dataStart,
    dataEnd,
    keywords,
    parameters,
    totalEvents,
    parameterCount,
    dataType,
    byteOrder
  }
}

export function parseFCSData(
  buffer: ArrayBuffer
): FCSDataSet {
  const metadata =
    parseFCSMetadata(buffer)

  const {
    dataStart,
    dataEnd,
    totalEvents,
    parameters,
    dataType,
    byteOrder
  } = metadata

  if (
    dataStart <= 0 ||
    dataEnd < dataStart
  ) {
    throw new Error(
      'The FCS DATA segment offsets are invalid.'
    )
  }

  if (dataEnd >= buffer.byteLength) {
    throw new Error(
      'The FCS DATA segment extends beyond the end of the file.'
    )
  }

  if (totalEvents <= 0) {
    throw new Error(
      'The FCS file contains no events.'
    )
  }

  if (parameters.length === 0) {
    throw new Error(
      'The FCS file contains no parameters.'
    )
  }

  const channels:
    Record<string, number[]> = {}

  const channelNames =
    parameters.map(
      (parameter) => {
        const label =
          getParameterLabel(
            parameter
          )

        const uniqueName =
          makeUniqueChannelName(
            label,
            channels
          )

        channels[uniqueName] = []

        return uniqueName
      }
    )

  const view =
    new DataView(
      buffer,
      dataStart,
      dataEnd - dataStart + 1
    )

  const littleEndian =
    isLittleEndian(byteOrder)

  let offset = 0

  for (
    let eventIndex = 0;
    eventIndex < totalEvents;
    eventIndex += 1
  ) {
    for (
      let parameterIndex = 0;
      parameterIndex < parameters.length;
      parameterIndex += 1
    ) {
      const parameter =
        parameters[parameterIndex]

      const channelName =
        channelNames[
          parameterIndex
        ]

      if (
        !parameter ||
        !channelName
      ) {
        continue
      }

      let value: number

      if (dataType === 'F') {
        value =
          view.getFloat32(
            offset,
            littleEndian
          )

        offset += 4
      } else if (dataType === 'D') {
        value =
          view.getFloat64(
            offset,
            littleEndian
          )

        offset += 8
      } else if (dataType === 'I') {
        if (parameter.bits === 8) {
          value =
            view.getUint8(
              offset
            )

          offset += 1
        } else if (
          parameter.bits === 16
        ) {
          value =
            view.getUint16(
              offset,
              littleEndian
            )

          offset += 2
        } else if (
          parameter.bits === 32
        ) {
          value =
            view.getUint32(
              offset,
              littleEndian
            )

          offset += 4
        } else {
          throw new Error(
            `Unsupported integer bit width: ${parameter.bits}`
          )
        }
      } else {
        throw new Error(
          `Unsupported FCS data type: "${dataType}"`
        )
      }

      channels[channelName].push(
        value
      )
    }
  }

  return {
    metadata,
    channels
  }
}