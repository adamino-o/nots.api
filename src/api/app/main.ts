import jwtMiddleware from '../../components/middleware'
import { config } from 'dotenv'
import { supabase } from '../../components/mongodb'

config()

const explorer = (fastify: any, options: any, done: any) => {
  fastify.addHook('preHandler', jwtMiddleware)

  fastify.get('/community', async (req: any, reply: any) => {
    const location = req.headers.location
    const session = req.session
    const rangeFrom = req.query.rangeFrom
    const rangeTo = req.query.rangeTo

    if (location || rangeTo || rangeFrom) {
      // Fetch di tutti i dati da communityUsers
      const { data, error, count } = await supabase
        .from('communityUsers')
        .select(`*, community(*, adminUser(*))`, { count: 'exact' })
        .eq('user', session.id)
        .range(rangeFrom, rangeTo)
        .order('createdAt', { ascending: false })

      if (!error) {
        let documents = data
        let communitiesSuggested = []

        // Fetch delle community consigliate
        const { data: recommendedCommunities, error: recommendedError } =
          await supabase
            .from('community')
            .select(`*`)
            .eq('location', location)
            .order('createdAt', { ascending: false })

        if (!recommendedError) {
          if (rangeFrom === '0') {
            // Filtra le community consigliate rimuovendo quelle a cui già partecipi
            communitiesSuggested = recommendedCommunities.filter(
              (community) => {
                return !documents.some(
                  (doc) => doc.community.id === community.id
                )
              }
            )
          }
        }
        // Fetch dell'ultimo messaggio da communityMessages per ogni community
        for (let i = 0; i < documents.length; i++) {
          const communityUser = documents[i]
          const { data: lastMessage, error: messageError } = await supabase
            .from('communityMessages')
            .select('*, user(*)')
            .eq('community', communityUser.community.id)
            .order('createdAt', { ascending: false })
            .limit(1)
          if (!messageError && lastMessage.length > 0) {
            documents[i] = { ...communityUser, lastMessage: lastMessage[0] }
          }
        }

        // Fetch degli ultimi 15 messaggi da communityMessages per ogni community
        for (let i = 0; i < documents.length; i++) {
          const communityUser = documents[i]
          const { data: lastMessages, error: messagesError } = await supabase
            .from('communityMessages')
            .select('*, user(*)')
            .eq('community', communityUser.community.id)
            .order('createdAt', { ascending: false })
            .limit(30)
          if (!messagesError) {
            documents[i] = { ...communityUser, lastMessages }
          }
        }

        // Fetch delle notifiche per ogni community
        for (let i = 0; i < documents.length; i++) {
          const communityUser = documents[i]
          const { error: notificationsError, count: notificationsCount } =
            await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user', session.id)
              .eq('community', communityUser.community.id)
              .eq('isOpened', false)
          if (!notificationsError) {
            documents[i] = { ...communityUser, notificationsCount }
          }
        }

        reply.code(200).send({ documents, count, communitiesSuggested })
      } else {
        reply.code(500).send(error)
      }
    } else {
      reply.code(500).send({ error: 'No props passed correctly' })
    }
  })

  fastify.get('/explore', async (req: any, reply: any) => {
    const location = req.headers.location
    const session = req.session
    const rangeFrom = req.query.rangeFrom
    const rangeTo = req.query.rangeTo

    if (location || rangeTo || rangeFrom) {
      // Fetch di tutti i dati da posts
      const { data, error, count } = await supabase
        .from('posts')
        .select(`*, user(*)`, { count: 'exact' })
        .eq('location', location)
        .range(rangeFrom, rangeTo)
        .order('createdAt', { ascending: false })

      if (!error) {
        let documents = data

        // Fetch dei like e commenti per ogni post
        for (let i = 0; i < documents.length; i++) {
          const post = documents[i]
          const { data: likesData, error: likesError } = await supabase
            .from('likes')
            .select('*')
            .eq('id', session.identities[0].user_id + post.id)

          // Il json di ogni post viene modificato per poter inserire se l'utente ha insetiro il like o meno
          if (!likesError) {
            let like

            if (likesData.length !== 0) {
              like = true
            } else {
              like = false
            }

            documents[i] = { ...post, isLiked: like }
          } else {
            console.error('Errore nel fetch dei like:', likesError)
          }
        }

        if (documents.length >= 8) {
          if (rangeFrom === '0') {
            const { data: recommendedCommunitiesData, error } = await supabase
              .from('communityUsers')
              .select(`*, community(*, adminUser(*))`, { count: 'exact' })
              .eq('user', session.id)
              .order('createdAt', { ascending: false })

            if (!error) {
              let documentsdata = recommendedCommunitiesData
              let communitiesSuggested = []

              // Fetch delle community consigliate
              const { data: recommendedCommunities, error: recommendedError } =
                await supabase
                  .from('community')
                  .select(`*`)
                  .eq('location', location)
                  .order('createdAt', { ascending: false })

              if (!recommendedError) {
                communitiesSuggested = recommendedCommunities.filter(
                  (community) => {
                    return !documentsdata.some(
                      (doc) => doc.community.id === community.id
                    )
                  }
                )
                if (communitiesSuggested.length > 0) {
                  documents.push({
                    id: 'reccommended-1',
                    isRecommended: true,
                    communities: communitiesSuggested,
                  })
                }
              } else {
                reply.code(500).send(error)
                console.log(error)
              }
            }
          }
        }
        reply.code(200).send({ documents: [...documents], count })
      } else {
        reply.code(500).send(error)
        console.log(error)
      }
    } else {
      reply.code(500).send({ error: 'No props passed correctly' })
    }
  })

  fastify.get('/stories', async (req: any, reply: any) => {
    const session = req.session

    const userId = session.identities[0].user_id

    // Ottieni la lista dei followers
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select(`userTo(*)`)
      .eq('userFrom', userId)
      .order('createdAt', { ascending: false })

    if (followersError) {
      reply.code(500).send(followersError)
      console.log(followersError)
      return
    }

    // Risultato finale con struttura user: { userId, stories: [] }
    const results = []

    for (const follower of followers as any) {
      // Trova le storie per ogni follower
      const { data: stories, error: storyError } = await supabase
        .from('stories')
        .select('id, createdAt, mediaInfo')
        .eq('user', follower.userTo.id) // Assumi che 'user' sia il campo ID
        .order('createdAt', { ascending: true })

      if (storyError) {
        reply.code(500).send(storyError)
        console.log(storyError)
        return
      }

      // Aggiungi al risultato solo se ci sono storie per questo utente
      if (stories.length > 0) {
        results.push({
          user: follower.userTo,
          stories, // tutte le storie di questo utente
        })
      }
    }

    reply.send(results)
  })

  fastify.get('/shorts', async (req: any, reply: any) => {
    const location = req.headers.location
    const session = req.session
    const rangeFrom = req.query.rangeFrom
    const rangeTo = req.query.rangeTo

    if (location || rangeTo || rangeFrom) {
      // Fetch di tutti i dati da posts
      const { data, error, count } = await supabase
        .from('posts')
        .select(`*, user(*)`, { count: 'exact' })
        .eq('location', location)
        .eq('isPicture', true)
        .range(rangeFrom, rangeTo)
        .order('createdAt', { ascending: false })

      if (!error) {
        let documents = data

        // Fetch dei like e commenti per ogni post
        for (let i = 0; i < documents.length; i++) {
          const post = documents[i]
          const { data: likesData, error: likesError } = await supabase
            .from('likes')
            .select('*')
            .eq('id', session.identities[0].user_id + post.id)

          if (!likesError) {
            let like

            if (likesData.length !== 0) {
              like = true
            } else {
              like = false
            }

            documents[i] = { ...post, isLiked: like }
          } else {
            console.error('Errore nel fetch dei like:', likesError)
          }
        }

        // Filter posts with mediaInfo.type === 'video'
        documents = documents.filter((post) => post.mediaInfo.type === 'video')

        reply.code(200).send({ documents: [...documents], count })
      } else {
        reply.code(500).send(error)
        console.log(error)
      }
    } else {
      reply.code(500).send({ error: 'No props passed correctly' })
    }
  })

  done()
}

export default explorer
