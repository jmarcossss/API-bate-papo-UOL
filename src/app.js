// Todas as bibliotecas utiizadas
// import axios forom "axios"
import express from 'express'
import cors from 'cors'
import joi from 'joi'
import dotenv from 'dotenv'
import { MongoClient, ObjectId } from 'mongodb'
import dayjs from 'dayjs'

// Variáveis globais
const PORTA = 5000
const app = express()
app.use(express.json())
app.use(cors())
dotenv.config()
const boolF = false
const boolT = true

// Armazenamento de dados
const mongoClient = new MongoClient(process.env.DATABASE_URL)
// const db = mongoClient.db();
let db = mongoClient.db();


// Conectando ao mongo
mongoClient.connect().then(() => {
    db = mongoClient.db();
});

// Definindo o padrão dos usuários e das mensagens
const padraoDosUsuarios = joi.object({
    name: joi.string().min(2).max(30).required()
})
const padraoDasMensagens = joi.object({
    to: joi.string().min(1).max(100).required(),
    text: joi.string().min(1).max(100).required(),
    type: joi.string().min(1).max(100).required(),
})