/**
 * Utility to guarantee Urdu Nastaleeq fonts are fully ready before printing.
 */
export async function ensureUrduFontsLoaded() {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('16px UrduNastaleeq'),
          document.fonts.load('16px "Noto Nastaliq Urdu"'),
          document.fonts.load('700 16px UrduNastaleeq'),
          document.fonts.load('700 16px "Noto Nastaliq Urdu"'),
          document.fonts.ready,
        ]),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch (err) {
      console.warn('Urdu font preload check notice:', err);
    }
  }
}

/**
 * Safe print function that awaits font loading before opening the browser print dialog.
 */
export async function safePrint() {
  await ensureUrduFontsLoaded();
  window.print();
}
