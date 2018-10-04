import { Festival, Lineup } from './festival'
import { Client } from 'pg'
import { EventEmitter } from 'events'
import axios from 'axios'
import cheerio from 'cheerio'

export class MFWScraper extends EventEmitter {
  private urls: Array<string> = [
    'https://www.musicfestivalwizard.com/all-festivals',
    'https://www.musicfestivalwizard.com/festival-guide/us-festivals',
    'https://www.musicfestivalwizard.com/festival-guide/europe-festivals'
  ]
  constructor() {
    super()
  }

  emitFestival(festival: Festival) {
    this.emit('festival', festival)
  }

  emitLineup(lineup: Lineup) {
    this.emit('lineup', lineup)
  }

  async scrape(): Promise<Array<Festival>> {
    let promises: Array<Promise<any>> = []

    for (let i=0; i<this.urls.length; i++) {
      const $ = await axios(this.urls[i])
        .then((res: any) => cheerio.load(res.data))

      const pagesCount = Number($('.page-numbers').eq(-2).text())
      console.log(`found ${pagesCount} pages for ${this.urls[i]}`)

      for (let j=1; j<= pagesCount; j++) {
        promises.push(this.scrapePage(`${this.urls[i]}/page/${i}`))
      }
    }

    return Promise.all(promises.map(p => p.catch(console.log)))
  }

  async scrapePage(url: string): Promise<Array<Festival>>{
    let tryCount = 0

    let $: any
    while (tryCount < 3) {
      try {
        $ = await axios(url)
          .then((res: any) => cheerio.load(res.data))
        break
      } catch(err) {
        tryCount++ 
        await new Promise(res => setTimeout(res, 2000))
      }
    }

    return this.getFestivals($)
  }

  private timeout: Promise<null> = new Promise(res => res())

  private getFestivals($: any): Array<Festival> {
    const festivals: Array<Festival> = []
    $('.singlefestlisting')
      .each(async (i: Number, el: any) => {
        try {
          this.getFestival($, el)
          this.emitFestival(festival)
          festivals.push(festival)

          const url = $(el).find('.festivaltitle a').attr('href')
          const lineup = await this.scrapeLineup(name, url)
          this.emitLineup(lineup)
        } catch(err) {
          console.log(err)
        }
    })
    return festivals
  }

  private async getFestival($: any, el: any): Festival {
    const name = $(el).find('.festivaltitle a').text()
    const imgSrc = $(el).find('img').attr('src')
    const dateStr = $(el).find('.festivaldate').text()
    let [startDate, endDate] = dateStr
      .split('-').map((str: string) => {
        const date = new Date(str.includes('2018') ? str : str + ' 2018')
        return !isNaN(date.getTime()) ? date :
          new Date(dateStr.substring(0, dateStr.indexOf(' ') + 1) + str)
      })
    endDate = endDate && !isNaN(endDate.getTime()) ? endDate : startDate
    const [city, loc] = $(el).find('.festivallocation').text().split(', ')
    const location = loc.length === 2 ? {city, state: loc, country: 'United States'} : {city, state: '', country: loc}

    return Festival(name, imgSrc, startDate, endDate, location)
  }

  private async scrapeLineup(festival: string, url: string): Promise<Lineup> {
    let tryCount = 0

    let $: any
    while (tryCount < 3) {
      try {
        $ = await axios(url)
          .then((res: any) => cheerio.load(res.data))
        break
      } catch(err) {
        tryCount++ 
        await new Promise(res => setTimeout(res, 2000))
      }
    }

    const artists = $('.lineupguide ul li').map(() => $(this).text())
    return {festival, artists}
  }
}

