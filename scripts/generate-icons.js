const sharp = require('sharp')
const fs = require('fs')

fs.mkdirSync('public/icons', { recursive: true })

function makeSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="#C9A84C"/>
    <text
      x="50%" y="55%"
      dominant-baseline="middle"
      text-anchor="middle"
      font-family="sans-serif"
      font-weight="bold"
      font-size="${Math.round(size * 0.55)}"
      fill="#0A0B0F"
    >L</text>
  </svg>`
}

const icons = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]

icons.forEach(({ size, name }) => {
  sharp(Buffer.from(makeSvg(size)))
    .png()
    .toFile(`public/icons/${name}`, (err) => {
      if (err) throw err
      console.log(`Generated public/icons/${name}`)
    })
})
