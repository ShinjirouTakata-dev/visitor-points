/* Cross-platform kiosk bridge.
 * Android Capacitor uses @capacitor-mlkit/barcode-scanning when available.
 * Windows Edge keeps the browser BarcodeDetector fallback in app.js.
 */
(function installKioskPlatform(global) {
  const nativeBarcodeScanner = global.Capacitor?.Plugins?.BarcodeScanner;
  const formatMap = { EAN_8: 'ean_8', EAN_13: 'ean_13', CODABAR: 'codabar' };

  global.kioskPlatform = {
    isAndroidNative: () => Boolean(global.Capacitor?.isNativePlatform?.() && global.Capacitor.getPlatform?.() === 'android'),
    async scanBarcode() {
      if (!nativeBarcodeScanner) return null;
      const permission = await nativeBarcodeScanner.checkPermissions();
      if (permission.camera !== 'granted') {
        const requested = await nativeBarcodeScanner.requestPermissions();
        if (requested.camera !== 'granted') throw new Error('CAMERA_PERMISSION_DENIED');
      }
      const result = await nativeBarcodeScanner.scan({ formats: ['EAN_8', 'EAN_13', 'CODABAR'] });
      const barcode = result.barcodes?.[0];
      return barcode ? { rawValue: barcode.rawValue, format: formatMap[barcode.format] || String(barcode.format || '').toLowerCase() } : null;
    },
  };
}(window));
