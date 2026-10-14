# CoverKit

Beautiful assignment cover pages for NSU students. Fill in the form, watch the A4 cover update live, and download it as a PDF. Free and open source.

**Live site:** https://coverkit.parvezdev.workers.dev/

## Features

- Live A4 cover preview that updates as you type
- One-click PDF download
- Your details are saved in your browser, so they are still there next time
- Works on desktop and mobile
- No backend, no sign-up, no data leaves your device

## Run locally

It is a plain static site. Serve the folder with any local server, for example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from the folder can break the PDF export in some browsers, so a local server is recommended.

## Tech

HTML, CSS and vanilla JavaScript. PDF export uses [html2canvas](https://html2canvas.hertzen.com/) and [jsPDF](https://github.com/parallax/jsPDF), loaded from a CDN.

## License

The code in this repository is released under the [MIT License](LICENSE).

**Fonts:** Overused Grotesk is included in `assets/fonts/` and is licensed separately under the SIL Open Font License 1.1. See `assets/fonts/OverusedGrotesk-LICENSE.txt`.

**NSU name and seal:** The North South University name and seal belong to North South University. They are used here for student convenience. This project is not affiliated with or endorsed by NSU, and the seal is not covered by the MIT License.

## Credits

Built by Parvez & Claude.
