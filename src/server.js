import express from 'express'
import bodyParser from 'body-parser'
import { EAS } from 'eas-lib'
import dotenv from 'dotenv'
import fs from 'fs'
dotenv.config()

function validateData(schema, data) {
  const schemaKeys = new Set()
  const schemaParts = schema.split(',').map((part) => part.trim())
  for (const schemaPart of schemaParts) {
    const [type, key] = schemaPart.split(' ')
    schemaKeys.add(key)
  }

  let missingKeys = []
  for (const key of schemaKeys) {
    if (!data[key]) missingKeys.push(key)
  }

  if (missingKeys.length > 0) {
    return `Missing keys: ${missingKeys.join(', ')}`
  }
}

function readSchemaFromFile(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function castDataTypes(schema, data) {
  const schemaParts = schema.split(',').map((part) => part.trim())
  for (const schemaPart of schemaParts) {
    const [type, key] = schemaPart.split(' ')
    if (type === 'int') {
      data[key] = parseInt(data[key])
    } else if (type === 'int[]') {
      data[key] = data[key].map((item) => parseInt(item))
    }
  }
}

function setupServer() {
  const missingVars = []
  if (!process.env.OP_PROVIDER) missingVars.push('OP_PROVIDER')
  if (!process.env.PRIVATE_KEY) missingVars.push('PRIVATE_KEY')
  if (!process.env.SCHEMA_UID) missingVars.push('SCHEMA_UID')
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`)
    process.exit(1)
  }

  if (!fs.existsSync('.schema')) {
    console.error('Missing schema file')
    process.exit(1)
  }

  const providerUrl = process.env.OP_PROVIDER
  const privateKey = process.env.PRIVATE_KEY
  const schemaUID = process.env.SCHEMA_UID
  const schema = readSchemaFromFile('.schema')
  const port = process.argv[2] || process.env.PORT || 3000

  const server = express()

  server.use(bodyParser.json())

  server.get('/ping', (req, res) => {
    const { msg } = req.query
    res.status(200).send(`pong: ${msg}`)
  })

  server.post('/attest', async (req, res) => {
    const eas = new EAS(providerUrl, privateKey)

    const validationError = validateData(schema, req.body)
    if (validationError) {
      res.status(400).send({ error: validationError })
      return
    }

    // Cast data types in-place.
    castDataTypes(schema, req.body)

    let uid = null
    try {
      uid = await eas.attest(providerUrl, privateKey, schema, schemaUID, req.body)
    } catch (error) {
      res.status(500).send({ error: error.message })
      return
    }

    res.status(200).send({ uid })
  })

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`)
  })
}

setupServer()
