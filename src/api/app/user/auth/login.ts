import { config } from 'dotenv'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { client } from '../../../../components/mongodb'

config()

export const login = async (fastify: any, options: any, done: any) => {
    fastify.post('/login', async (request: any, reply: any) => {
        const { username, password } = request.body

        try {
            await client.connect()
            const database = client.db('your_database_name')
            const users = database.collection('users')

            const user = await users.findOne({ username })
            if (!user) {
                return reply.status(401).send({ message: 'Invalid username or password' })
            }

            const isPasswordValid = await bcrypt.compare(password, user.password)
            if (!isPasswordValid) {
                return reply.status(401).send({ message: 'Invalid username or password' })
            }

            const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' })
            return reply.send({ token })
        } catch (error) {
            return reply.status(500).send({ message: 'Internal Server Error' })
        } finally {
            await client.close()
        }
    })

    done()
}