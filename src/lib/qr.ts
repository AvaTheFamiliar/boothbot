import QRCode from 'qrcode'

export async function generateQRCode(data: string): Promise<Buffer> {
  try {
    const qrBuffer = await QRCode.toBuffer(data, {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M'
    })
    return qrBuffer
  } catch (error) {
    throw new Error('Failed to generate QR code')
  }
}

export function generateEventQRData(eventId: string, botUsername: string): string {
  return `https://t.me/${botUsername}?start=event_${eventId}`
}

export async function generateEventQR(eventId: string, botUsername: string): Promise<Buffer> {
  const qrData = generateEventQRData(eventId, botUsername)
  return generateQRCode(qrData)
}
