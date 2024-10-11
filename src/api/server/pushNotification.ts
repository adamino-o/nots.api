import { commnuityMessageNotification, sendFollowerNotification } from '../../components/notifications'
import { config } from 'dotenv'

config()

const PushNotifications = (fastify: any, options: any, done: any) => {
  fastify.addHook('preHandler', async (req: any, reply: any) => {
    const Authorization = req.query.authorization

    if (!Authorization) {
      reply.code(401).send({ error: 'No JWT provided' })
      return
    }

    if (Authorization === process.env.ONESIGNAL_TOKEN_KEY) {
      return
    } else {
      reply.code(401).send({ error: 'Non autorizzato' })
      return
    }
  })

  fastify.post('/follower', async (req: any, reply: any) => {
    await sendFollowerNotification(req.body.record, reply)
  })


  fastify.post('/commnuityMessageNotification', async (req: any, reply: any) => {
    await commnuityMessageNotification(req.body.record, reply)
  })

  done()
}

export default PushNotifications
