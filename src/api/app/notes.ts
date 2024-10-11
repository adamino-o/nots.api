import { client } from "../../components/mongodb";

export const Note = (fastify: any, options: any, done: any) => {
    fastify.get('/', async (req: any, reply: any) => {
        const database = client.db("datas");
        const collection = database.collection("notes");

        const notes = await collection.find({}).toArray();
        reply.send(notes);
    });

    fastify.get('/add', async (req: any, reply: any) => {
        await client.connect();
        const database = client.db("datas");
        const collection = database.collection("notes");
    
        const defaultNote = {
            title: "Default Title",
            content: "Default Content",
            createdAt: new Date()
        };
    
        const result: any = await collection.insertOne(defaultNote);
    });

    done();
}
