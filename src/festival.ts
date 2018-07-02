import { Client } from 'pg'
import uuidv4 from 'uuid/v4'
import { EventEmitter } from 'events'

export interface FestivalScraper extends EventEmitter {
  scrape(): Promise<Array<Festival>>
  on(event: 'festival', listener: (festival: Festival) => void): this
  on(event: 'lineup', listener: (lineup: Lineup) => void): this
}

export class Storage {
  private connected: Promise<void>
  constructor(private client: Client) {
    this.connected = this.client.connect()
  }
  async saveFestival(festival: Festival): Promise<Object> {
    await this.connected

    const { name, imgSrc, startDate, endDate, location } = festival
    const { country, state, city } = location

    const args = [name, imgSrc, startDate, endDate, country, state, city]
    const updateQuery = `UPDATE festival
      SET img_src, start_date, end_date, country, state, city =
      ($2, $3, $4, $5, $6, $7)
      WHERE name = $1`
      
    const insertQuery = `INSERT INTO festival
      (id, name, img_src, start_date, end_date, country, state, city)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

    return this.client.query(updateQuery, args)
      .catch(err => this.client.query(insertQuery, [uuidv4(), ...args]))
  }
  async saveLineup(lineup: Lineup): Promise<Object> {
    await this.connected

    const { festival, artists } = lineup

    const res = await this.client.query('SELECT id FROM festival WHERE name = $1', [festival])
    const festivalID = res.rows[0]

    const festivalArtistQ = `INSERT INTO festival_artist(id, festival_id, artist_id)
    VALUES ($1, $2, $3)`

    return artists.map(async artist => {
      const ID = uuidv4()
      const res = await this.client.query('SELECT id FROM artist WHERE name = $1', [artist])
      const artistID = res.rows[0]
        return this.client.query(festivalArtistQ, [ID, festival, artistID]) 
    })
  }
}

export class Festival {
  constructor(public name: string, public imgSrc: string,
    public startDate: Date, public endDate: Date, public location: Location) {
  }
}

export interface Location {
  state: string
  city: string
  country: string
}

export interface Lineup {
  festival: string
  artists: Array<String>
}
