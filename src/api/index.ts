import cors from '@fastify/cors'
import Fastify from 'fastify'
import { Note } from './app/notes'

const app = Fastify({
  logger: true,
})

app.register(cors, {
  origin: false,
})

app.register(require('@fastify/websocket'), {
  options: { maxPayload: 1048576 }
})

app.register(Note, { prefix: '/api/note' })



app.get('/', async (req: any, reply: any) => {
  reply.code(200).send({ response: 'pong' })
})

try {
  app.listen({ host: '0.0.0.0', port: 1929 })
  // setInterval(CheckStories, 1000000)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
