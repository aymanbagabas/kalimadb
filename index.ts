import fs from 'fs'
import sqlite3 from 'sqlite3'
import * as sqlite from 'sqlite'
import FnanenDB from './sources/fnanen.com/index.js'
import WneenDB from './sources/wneen.com/index.js'

interface Song {
  title: string
  artist: string
  author?: string
  composer?: string
  lyrics?: string
  arranger?: string
  mixer?: string
  master?: string
  date?: string
  url?: string
}

export interface SDB {
  [key: string]: Song[]
}

export interface SDBDownloader {
  get(): Promise<SDB>
}

const DBFILE = './kalimadb.db'

const tables = [
  'author', 'composer', 'arranger', 'album', 'mixer', 'master'
]

const songsTable = `
CREATE TABLE songs (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  lyrics TEXT NOT NULL,
  date TEXT,
  url TEXT,
  composer_id INTEGER,
  arranger_id INTEGER,
  mixer_id INTEGER,
  author_id INTEGER,
  artist_id INTEGER,
  album_id INTEGER,
  master_id INTEGER,
  FOREIGN KEY(composer_id) REFERENCES composers(id),
  FOREIGN KEY(arranger_id) REFERENCES arrangers(id),
  FOREIGN KEY(mixer_id) REFERENCES mixers(id),
  FOREIGN KEY(author_id) REFERENCES authors(id),
  FOREIGN KEY(artist_id) REFERENCES artists(id),
  FOREIGN KEY(album_id) REFERENCES albums(id)
  FOREIGN KEY(master_id) REFERENCES masters(id)
)
`

async function scrapeDbs (): Promise<SDB[]> {
  const dbs = [new FnanenDB(), new WneenDB()]
  return Promise.all(dbs.map(db => db.get()))
}

async function main () {
  if (fs.existsSync(DBFILE)) {
    fs.unlinkSync(DBFILE)
  }

  console.log('Opening database...')
  const db = await sqlite.open({
    driver: sqlite3.cached.Database,
    filename: DBFILE
  })

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON;')

  for (const prop of [...tables, 'artist']) {
    const table = prop + 's'
    console.log(`Creating ${table} table...`)
    const sqlstr = `
      CREATE TABLE ${table} (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )
    `
    await db.exec(sqlstr)
  }
  console.log('Creating songs table...')
  await db.exec(songsTable)

  const dbs = await scrapeDbs()

  for (const sdb of dbs) {
    console.log('Inserting data...')
    Object.keys(sdb).forEach(async key => {
      let artistId
      const artistName = key
      const artistsResult = await db.get('SELECT * FROM artists WHERE name = ? LIMIT 1', artistName)
      if (!artistsResult) {
        const res = await db.run('INSERT INTO artists (name) VALUES (?)', artistName)
        artistId = res.lastID
      } else {
        artistId = artistsResult.id
      }
      console.log(`Inserted artist ${artistName} with ID: ${artistId}`)

      for (const song of sdb[key]) {
        const id: {
          composer?: number,
          arranger?: number,
          mixer?: number,
          author?: number,
          album?: number,
          master?: number
        } = {}
        for (const prop of tables) {
          const table = prop + 's'
          if (song[prop]) {
            const propResult = await db.get(`SELECT * FROM ${table} WHERE name = ? LIMIT 1`, song[prop])
            if (!propResult) {
              const res = await db.run(`INSERT INTO ${table} (name) VALUES ("${song[prop]}");`)
              id[prop] = res.lastID
            } else {
              id[prop] = propResult.id
            }
            console.log(`Inserted ${prop} ${song[prop]} with ID: ${id[prop]}`)
          }
        }

        if (song.title) {
          const songRes = await db.run(`
            INSERT INTO songs (title, lyrics, date, url, composer_id, arranger_id, mixer_id, author_id, album_id, master_id, artist_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            song.title,
            song.lyrics,
            song.date || null,
            song.url || null,
            id.composer || null,
            id.arranger || null,
            id.mixer || null,
            id.author || null,
            id.album || null,
            id.master || null,
            artistId
          ])
          console.log(`Inserted song ${song.title} with ID: ${songRes.lastID}`)
        } else {
          console.error('Song title is empty', song)
        }
      }
    })
  }
}

main()
