import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { MongoClient } from 'mongodb';

config()

const url = process.env.MONGODB as any
export const client = new MongoClient(url);