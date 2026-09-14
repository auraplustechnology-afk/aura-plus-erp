'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, BarcodeFormat, type IScannerControls } from '@zxing/browser'
import { X, Camera, Zap, ZapOff, SwitchCamera, Loader2 } from 'lucide-react'

// Retail products almost always carry a 1D barcode (EAN-13/UPC-A most
// commonly, with EAN-8/UPC-E/Code128/Code39/ITF/Codabar covering the
// rest); QR is included too since a few SKUs use it for longer codes.
// Restricting formats (instead of trying every format ZXing supports)
// makes each frame decode noticeably faster.
const POSSIBLE_FORMATS = [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
  BarcodeFormat.ITF, BarcodeFormat.CODABAR,
  BarcodeFormat.QR_CODE,
]

// Ignore the same code decoded again within this window — the camera
// re-reads the same held-up barcode on every frame, and without this
// a single item would get scanned (and added to the cart) many times.
const DUPLICATE_SUPPRESS_MS = 1500

export default function CameraBarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const lastCodeRef = useRef<string>('')
  const lastScanAtRef = useRef<number>(0)

  const [starting, setStarting] = useState(true)
  const [error, setError] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceIndex, setDeviceIndex] = useState(0)
  const [lastAdded, setLastAdded] = useState('')

  async function start(deviceId?: string) {
    setError('')
    setStarting(true)
    setTorchOn(false)
    setTorchSupported(false)

    const reader = new BrowserMultiFormatReader()
    reader.possibleFormats = POSSIBLE_FORMATS

    const constraints: MediaStreamConstraints = deviceId
      ? { video: { deviceId: { exact: deviceId } } }
      : { video: { facingMode: 'environment' } }

    try {
      await reader.decodeFromConstraints(constraints, videoRef.current!, (result, _err, controls) => {
        controlsRef.current = controls
        if (!result) return

        const text = result.getText()
        const now = Date.now()
        if (text === lastCodeRef.current && now - lastScanAtRef.current < DUPLICATE_SUPPRESS_MS) return

        lastCodeRef.current = text
        lastScanAtRef.current = now
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(80)
        setLastAdded(text)
        onScan(text)
      })
      setStarting(false)

      try {
        const stream = videoRef.current?.srcObject as MediaStream | null
        const track = stream?.getVideoTracks()[0]
        const caps = track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean } | undefined
        setTorchSupported(!!caps?.torch)
      } catch {
        setTorchSupported(false)
      }
    } catch (err) {
      setStarting(false)
      const message = err instanceof Error ? err.message.toLowerCase() : ''
      setError(
        message.includes('permission') || message.includes('denied') || message.includes('notallowed')
          ? 'Camera access was denied. Allow camera permission for this site in your browser and try again.'
          : message.includes('notfound') || message.includes('no camera')
          ? 'No camera was found on this device.'
          : 'Could not start the camera. Please try again.'
      )
    }
  }

  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices().then(setDevices).catch(() => {})
    start()
    return () => { controlsRef.current?.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!lastAdded) return
    const t = setTimeout(() => setLastAdded(''), 1200)
    return () => clearTimeout(t)
  }, [lastAdded])

  async function toggleTorch() {
    if (!controlsRef.current?.switchTorch) return
    try {
      await controlsRef.current.switchTorch(!torchOn)
      setTorchOn(v => !v)
    } catch {
      // Torch control isn't supported on this device/browser — ignore.
    }
  }

  function switchCamera() {
    if (devices.length < 2) return
    controlsRef.current?.stop()
    const next = (deviceIndex + 1) % devices.length
    setDeviceIndex(next)
    start(devices[next].deviceId)
  }

  function handleClose() {
    controlsRef.current?.stop()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-white font-medium text-sm flex items-center gap-2">
          <Camera className="w-4 h-4" /> Scan Barcode
        </span>
        <button onClick={handleClose} className="p-2 rounded-lg text-white/80 hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden flex items-center justify-center">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

        {!error && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[75%] max-w-sm aspect-[2/1] rounded-2xl border-2 border-white/80" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
          </div>
        )}

        {starting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 text-sm bg-black/30">
            <Loader2 className="w-6 h-6 animate-spin" /> Starting camera...
          </div>
        )}

        {error && (
          <div className="px-6 text-center max-w-xs">
            <p className="text-white text-sm mb-4">{error}</p>
            <button onClick={() => start()} className="btn-primary">Try Again</button>
          </div>
        )}

        {lastAdded && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
            ✓ Scanned {lastAdded}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 px-4 py-4">
        {torchSupported && (
          <button onClick={toggleTorch} className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20">
            {torchOn ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
          </button>
        )}
        {devices.length > 1 && (
          <button onClick={switchCamera} className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20">
            <SwitchCamera className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
