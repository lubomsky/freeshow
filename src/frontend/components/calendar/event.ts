import { get } from "svelte/store"
import { uid } from "uid"
import type { Event } from "../../../types/Calendar"
import { shows } from "../../stores"
import { history } from "../helpers/history"

export function createRepeatedEvents(event: Event) {
  // <!-- REPEAT EVERY: {1-10000}, {day, week, month, year} -->
  // <!-- REPEAT ON: {MO,TH,WE,TH,FR,SA,SU} (if "week") -->
  // <!-- ENDING: {date, after {10} times, never} -->

  let data = event.repeatData!
  let dates: string[][] = []

  let currentFromDate = new Date(event.from)
  let currentToDate = new Date(event.to)
  let endingDate = new Date(data.endingDate || "")
  endingDate = setDate(currentFromDate, { date: endingDate.getDate(), month: endingDate.getMonth(), year: endingDate.getFullYear() })

  const increment = {
    day: () => [currentFromDate.getDate() + Number(data.count), currentToDate.getDate() + Number(data.count)],
    week: () => [currentFromDate.getDate() + 7 * Number(data.count), currentToDate.getDate() + 7 * Number(data.count)],
    month: () => {
      let newMonth: number[] = [currentFromDate.getMonth() + Number(data.count), currentToDate.getMonth() + Number(data.count)]
      if (newMonth[0] > 11) {
        currentFromDate = setDate(currentFromDate, { month: 0, year: currentFromDate.getFullYear() + 1 })
        newMonth[0] = newMonth[0] - 12
      }
      if (newMonth[1] > 11) {
        currentToDate = setDate(currentToDate, { month: 0, year: currentToDate.getFullYear() + 1 })
        newMonth[1] = newMonth[1] - 12
      }
      return newMonth
    },
    year: () => [currentFromDate.getFullYear() + Number(data.count), currentToDate.getFullYear() + Number(data.count)],
  }

  // get dates array
  // TODO: repeat on weekdays...
  if (data.ending === "date") {
    while (currentFromDate.getTime() <= endingDate.getTime()) {
      let incremented = increment[data.type]()
      console.log(currentFromDate, endingDate, data.count, incremented)

      if (data.type === "day" || data.type === "week") {
        currentFromDate.setDate(incremented[0])
        currentToDate.setDate(incremented[1])
      } else {
        currentFromDate = setDate(currentFromDate, { [data.type]: incremented[0] })
        currentToDate = setDate(currentToDate, { [data.type]: incremented[1] })
      }

      if (currentFromDate.getTime() <= endingDate.getTime()) {
        dates.push([currentFromDate.toString(), currentToDate.toString()])
      }
    }
  } else if (data.ending === "after") {
    let count = 0
    while (count < data.afterRepeats!) {
      count++
      let incremented = increment[data.type]()

      if (data.type === "day" || data.type === "week") {
        currentFromDate.setDate(incremented[0])
        currentToDate.setDate(incremented[1])
      } else {
        currentFromDate = setDate(currentFromDate, { [data.type]: incremented[0] })
        currentToDate = setDate(currentToDate, { [data.type]: incremented[1] })
      }

      if (count < data.afterRepeats!) {
        dates.push([currentFromDate.toString(), currentToDate.toString()])
      }
    }
  }

  // create events
  dates.forEach((date: string[]) => {
    let newEvent = JSON.parse(JSON.stringify(event))

    newEvent.from = date[0]
    newEvent.to = date[1]

    history({ id: "newEvent", newData: { id: uid(), data: newEvent } })
  })
}

const setDate = (date: Date, options: any): Date => {
  let newDate = [options.year ?? date.getFullYear(), (options.month ?? date.getMonth()) + 1, options.date ?? date.getDate()]
  let time = date.getHours() + ":" + date.getMinutes()
  return new Date([...newDate, time].join(" "))
}

export function updateEventData(editEvent: any, stored: any, { type, show }: any): any {
  let data = JSON.parse(JSON.stringify(editEvent))
  let oldData = JSON.parse(stored)
  let id = editEvent.id

  data.from = new Date(editEvent.isoFrom + " " + (editEvent.time ? editEvent.fromTime : ""))
  oldData.from = new Date(oldData.isoFrom + " " + (oldData.time ? oldData.fromTime : ""))
  data.to = new Date(editEvent.isoTo + " " + (editEvent ? editEvent.toTime : ""))
  oldData.to = new Date(oldData.isoTo + " " + (oldData ? oldData.toTime : ""))
  data.type = type.id
  oldData.type = type.id

  console.log(data.from, editEvent.fromTime)

  // to has to be after from
  if (data.to.getTime() - data.from.getTime() <= 0) data.to = data.from
  // if (data.to.getTime() - data.from.getTime() <= 0) {
  //   activePopup.set(null)
  //   return { data: null, oldData: null, id }
  // }

  delete data.id
  delete data.isoFrom
  delete data.isoTo
  delete data.fromTime
  delete data.toTime
  delete oldData.id
  delete oldData.isoFrom
  delete oldData.isoTo
  delete oldData.fromTime
  delete oldData.toTime

  console.log(data)

  if (data.type === "show") data = getShowEventData(data, show.id)

  return { data, oldData, id }
}

// export const icons: any = {
//   event: "calendar",
//   show: "slide"
// }

// show
export function getShowEventData(event: any, showId: string) {
  let show: any = get(shows)[showId]
  event.show = showId
  event.name = show.name
  event.color = null
  delete event.location
  delete event.notes

  return event
}
