import fetch from 'node-fetch'
import cheerio from 'cheerio'
import he from 'he'

const url = 'https://www.wneen.com'
const artistsUrl = `${url}/all-singers`

export function fetchArtists () {
  return fetch(artistsUrl)
    .then(res => res.text())
    .then(async html => {
      const $ = cheerio.load(html)
      const artistsEls = $('#myTable li a')
      return artistsEls.map((_, el) => {
        return {
          artist: he.decode(el.children[0].data),
          url: `${url}${el.attribs.href}`
        }
      }).toArray()
    })
}

async function parseSongs (html) {
  const $ = cheerio.load(html)
  const songsEls = $('table.table tbody tr td a.co.f2')
  return songsEls.map((_, el) => {
    return {
      name: he.decode(el.children[0].data),
      url: `${url}${el.attribs.href}`
    }
  }).toArray()
}

export function fetchSongs (artist) {
  const artistUrl = artist.url
  let maxPage = 1
  return fetch(artistUrl)
    .then(res => res.text())
    .then(async html => {
      const $ = cheerio.load(html)
      const pagesEls = $('.pagination .page-item .page-link')
      if (pagesEls.length > 1) {
        // parse last page
        const maxPageHref = pagesEls.last().attr('href')
        maxPage = parseInt(maxPageHref.split('/').pop())
        return await Promise.all([...Array(maxPage).keys()].map(i => {
          return fetch(`${artistUrl}/${i + 1}`)
            .then(res => res.text())
            .then(parseSongs)
            .then(songs => songs || [])
        })).then(songs => songs.flat())
      } else {
        return parseSongs(html)
      }
    })
}

export function fetchSong (song) {
  return fetch(song.url)
    .then(res => res.text())
    .then(async html => {
      const $ = cheerio.load(html)
      const lyricsEl = $('.box6 .box6-inner p.f3')
      const lyrics = lyricsEl.html().replace(/<br>/g, '\n')
      const meta = $('div.content p.info')
      let singer, author, composer, mixer, master, date, album, arranger
      meta.each(function () {
        $(this).children().each(function () {
          const key = $(this).text()?.trim()
          const val = $(this)?.next()?.next()?.text()?.trim()
          switch (key) {
            case 'غناء':
              singer = val
              break
            case 'كلمات':
              author = val
              break
            case 'الحان':
              composer = val
              break
            case 'مكس':
              mixer = val
              break
            case 'توزيع':
              arranger = val
              break
            case 'ماستر':
              master = val
              break
            case 'السنة':
              date = val
              break
            case 'البوم':
              album = val
              break
          }
        })
      })
      const data = {
        title: song.name,
        url: song.url,
        lyrics
      }
      if (singer) {
        data.singer = singer
      }
      if (author) {
        data.author = author
      }
      if (composer) {
        data.composer = composer
      }
      if (mixer) {
        data.mixer = mixer
      }
      if (master) {
        data.master = master
      }
      if (date) {
        data.date = date
      }
      if (album) {
        data.album = album
      }
      if (arranger) {
        data.arranger = arranger
      }
      return data
    })
}
