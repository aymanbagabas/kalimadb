import assert from 'assert'
import { fetchSongs, fetchSong } from '../scraper.js'
import { describe, it } from 'mocha'
import fs from 'fs/promises'
import path from 'path'

function assertSong (t, file, song) {
  t.timeout(20000)
  return fs.readFile(path.resolve('sources', 'wneen.com', 'test', file)).then(data => {
    const expectedSong = JSON.parse(data)
    return fetchSong(song).then(actualSong => {
      assert.deepStrictEqual(actualSong, expectedSong)
    })
  })
}

describe('scraper', function () {
  describe('singers', function () {
    this.timeout(20000)
    it('should return ابراهيم الحكمي 47 songs', function () {
      return fetchSongs({
        artist: 'ابراهيم الحكمي',
        url: 'https://www.wneen.com/singer/128'
      }).then(songs => {
        assert.equal(songs.length, 47)
      })
    })

    it('should return محمد عبده 460 songs', function () {
      return fetchSongs({
        artist: 'محمد عبده',
        url: 'https://www.wneen.com/singer/1'
      }).then(songs => {
        assert.equal(songs.length, 460)
      })
    })
  })

  describe('songs', function () {
    it('11121', function () {
      const song = {
        name: 'ابتسم',
        url: 'https://www.wneen.com/lyrics/11121'
      }
      return assertSong(this, '11121.json', song)
    })
  })
})
