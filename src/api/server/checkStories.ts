import { supabase } from '../../components/mongodb'

export default async function CheckStories() {
  try {
    const response = await fetch(
      'http://worldtimeapi.org/api/timezone/Europe/Rome'
    )
    const worldTimeData = await response.json()
    const date = new Date(worldTimeData.datetime)

    const twentyFourHoursAgo = new Date(
        date.getTime() - 24 * 60 * 60 * 1000
    )
    const dateIso = twentyFourHoursAgo.toISOString()
    console.log(dateIso)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('isStory', true)
      .lt('createdAt', dateIso);

    if (error) {
      console.error(error)
    } else {
      if (data && data.length > 0) {
        data.forEach((story) => {
          const storyCreationDate = new Date(story.createdAt)
          if (storyCreationDate > twentyFourHoursAgo) {
            console.log('ID:', story.id, story.createdAt)
          }
        })
      } else {
        console.log('Nessuna storia trovata')
      }
    }
  } catch (e) {
    console.error(e)
  }
}
