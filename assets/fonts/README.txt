The Overused Grotesk .woff2 files and OverusedGrotesk-LICENSE.txt were not
part of the code hand-off used for this fix pass. Copy your existing
assets/fonts/ contents from the current repo/deployment into this folder:

  OverusedGrotesk-Light.woff2
  OverusedGrotesk-LightItalic.woff2
  OverusedGrotesk-Roman.woff2
  OverusedGrotesk-Medium.woff2
  OverusedGrotesk-SemiBold.woff2
  OverusedGrotesk-Bold.woff2
  OverusedGrotesk-LICENSE.txt

style.css already points at exactly these file names. Without them the site
falls back to Helvetica/Arial — it still works, it just looks less CoverKit.
