import fs from 'fs'
import { fetchArtists, fetchSongs, fetchSong } from './scraper.js'
import { SDB, SDBDownloader } from '../../index.js'

function log (...args) {
  console.log('(wneen.com)', ...args)
}

export default class WneenDB implements SDBDownloader {
  async get (): Promise<SDB> {
    const dump = {}
    log('fetching artists...')
    const artists = await fetchArtists()
    for (const artist of artists) {
      log(`fetching songs for ${artist.artist}`)
      dump[artist.artist] = []
      const songs = await fetchSongs(artist)
      for (const song of songs) {
        log(`fetching song ${song.name}`)
        const s = await fetchSong(song)
        dump[artist.artist].push(s)
      }
    }
    fs.writeFileSync('wneen.json', JSON.stringify(dump))
    return Promise.resolve(dump)
  }
}
