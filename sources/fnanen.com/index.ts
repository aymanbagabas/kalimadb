import { fetchLetters, fetchArtists, fetchSongs, fetchSong } from './scraper.js'
import { SDB, SDBDownloader } from '../../index.js'
import * as fs from 'fs'

function log (...args) {
  console.log('(fnanen.com)', ...args)
}

export default class FnanenDB implements SDBDownloader {
  private artistSongs: SDB = {}
  async get (): Promise<SDB> {
    const artists: any[] = []
    const allSongs: any[] = []
    // letters
    await fetchLetters().then(letters => {
      return Promise.all(letters.map(letter => {
      // artists
        return fetchArtists(letter).then(as => {
          as.forEach(artist => {
            const artistName = (artist.name || '').trim()
            artists.push({
              name: artistName,
              url: artist.url
            })
            log(`Reading ${letter}`)
            this.artistSongs[artistName] = []
          })
        })
      })
      )
    })

    // allSongs
    const chunks = 100
    for (let i = 0; i < artists.length; i += chunks) {
      const chunk = artists.slice(i, i + chunks)
      await Promise.all(chunk.map(async artist => {
        const artistName = artist.name
        log(`Reading artist ${artistName}`)
        return fetchSongs(artist).then(songs => {
          allSongs.push(...songs)
          log(`Done scraping artist ${artistName}`)
        })
      }))
    }

    // parseSongs
    const songChunks = 200
    for (let i = 0; i < allSongs.length; i += songChunks) {
      const chunk = allSongs.slice(i, i + songChunks)
      await Promise.all(chunk.map(async song => {
        const artist = song.artist
        const songUrl = song.url
        log(`Scraping ${songUrl}...`)
        return fetchSong(songUrl).then(data => {
          this.artistSongs[artist].push({ ...data, artist })
        }).then(() => {
          log(`Scraped ${songUrl}`)
        })
      })
      )
    }
    fs.writeFileSync('fnanendb.json', JSON.stringify(this.artistSongs))

    return Promise.resolve(this.artistSongs)
  }
}
