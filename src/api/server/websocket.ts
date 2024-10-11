import jwtMiddleware from '../../components/middleware'
import { config } from 'dotenv'
import { supabase } from '../../components/mongodb'

config()

const websocket = async (fastify: any) => {
  fastify.addHook('preHandler', async (req: any, reply: any) => {
    const JWT = req.query.JWT

    if (!JWT) {
      reply.code(401).send({ error: 'No JWT provided' })
      return
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(JWT)

    if (error) {
      reply.code(401).send(error)
      return
    } else {
      req.session = user
    }
  })

  fastify.get(
    '/setIsOnChat',
    { websocket: true },
    async (connection: any, req: any) => {
      const communityId = req.query.id
      const userId = req.session.id

      if (!communityId) {
        connection.close()
        return
      }
      await updateIsOnChat(communityId, userId, true)

      connection.on('message', (message: any) => {
        connection.send('hi from server')
      })

      connection.on('close', async () => {
        await updateIsOnChat(communityId, userId, false)
      })
    }
  )
}

async function updateIsOnChat(
  communityId: string,
  userId: string,
  isOnChat: boolean
) {
  const { error } = await supabase
    .from('communityUsers')
    .update({ isOnChat: isOnChat })
    .eq('user', userId)
    .eq('community', communityId)
    .single()

  if (error) {
    console.log(error)
  }
}

export default websocket
