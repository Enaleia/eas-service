import express from 'express'
import { EAS } from 'eas-lib'
import fs from 'fs'

const res = (status) => (json) => ({ statusCode: status, body: json })

async function attest(body) {
  const missingVars = []
  if (!process.env.OP_PROVIDER) missingVars.push('OP_PROVIDER')
  if (!process.env.PRIVATE_KEY) missingVars.push('PRIVATE_KEY')
  if (!process.env.SCHEMA) missingVars.push('SCHEMA')
  if (!process.env.SCHEMA_UID) missingVars.push('SCHEMA_UID')
  if (missingVars.length > 0)
    return res(500)({
      message: `Missing required environment variables: ${missingVars.join(', ')}`,
    })

  const providerUrl = process.env.OP_PROVIDER
  const privateKey = process.env.PRIVATE_KEY
  const schema = process.env.SCHEMA
  const schemaUID = process.env.SCHEMA_UID

  const eas = new EAS(providerUrl, privateKey, schema, schemaUID)

  const { status, missingKeys } = EAS.validateSchemaData(schema, body)
  if (!status)
    return res(400)({
      error: `Missing keys: ${missingKeys.join(', ')}`,
    })

  // Cast data types in-place.
  EAS.castSchemaDataTypes(schema, body)

  let uid = null
  try {
    uid = await eas.attest(body)
  } catch (error) {
    return res(500)({ error: error.message })
  }

  return res(200)({ uid })
}

export const handler = async (event) => {
  const http = event.requestContext.http

  if (http.method === 'GET' && http.path === '/ping') {
    return {
      statusCode: 200,
      body: 'pong',
    }
  }

  if (http.method === 'POST' && http.path === '/attest') {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    return await attest(body)
  }
}
