import { Festival, Storage, FestivalScraper } from './festival'
import { MFWScraper } from './music-festival-wizard'
import { EventEmitter } from 'events'
import cheerio from 'cheerio'
import { Client } from 'pg'

let client

if (process.env.PG_DSN === undefined) {
  console.log('Environment variable PG_DSN must be set')
  process.exit(1)
}

async function main()  {
  client = new Client({ connectionString: process.env.PG_DSN })
  const festivalStorage = new Storage(client)
  console.log('connected to db')

  let scraper: FestivalScraper
  scraper = new MFWScraper()
  let festCount = 0
  scraper.on('festival', fest => {
    festivalStorage.saveFestival(fest)
      .then(() => console.log(`inserted/updated ${fest} into DB`))
      .then(() => festCount++)
      .catch(console.log)
  })

  let lineupCount = 0
  scraper.on('lineup', lineup => {
    festivalStorage.saveLineup(lineup)
    .then(() => console.log(`inserted/updated ${lineup.festival}'s lineup into DB`))
    .then(() => lineupCount++)
    .catch(console.log)
  })

  await scraper.scrape()
  console.log(`saved ${festCount} festivals to DB`)
  console.log(`saved ${lineupCount} lineups to DB`)

  process.exit()
}

main()

