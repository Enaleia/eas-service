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

async function get_balance({ address }) {
  const missingVars = []
  if (!process.env.OP_PROVIDER) missingVars.push('OP_PROVIDER')
  if (!process.env.PRIVATE_KEY) missingVars.push('PRIVATE_KEY')
  if (missingVars.length > 0)
    return res(500)({
      message: `Missing required environment variables: ${missingVars.join(', ')}`,
    })

  if (!address) {
    return res(400)({ error: 'Missing address parameter' })
  }

  const providerUrl = process.env.OP_PROVIDER
  const privateKey = process.env.PRIVATE_KEY

  const eas = new EAS(providerUrl)

  let balance = null
  try {
    balance = await eas.getBalance(address)
  } catch (error) {
    return res(500)({ error: error.message })
  }

  return res(200)({ balance })
}

async function fund_address({ address, amount }) {
  const missingVars = []
  if (!process.env.OP_PROVIDER) missingVars.push('OP_PROVIDER')
  if (!process.env.LOOT_BOX_PK) missingVars.push('LOOT_BOX_PK')
  if (!process.env.ADDRESS_MIN) missingVars.push('ADDRESS_MIN')
  if (missingVars.length > 0)
    return res(500)({
      message: `Missing required environment variables: ${missingVars.join(', ')}`,
    })

  if (!address) {
    return res(400)({ error: 'Missing address parameter' })
  }
  if (!amount) {
    return res(400)({ error: 'Missing amount parameter' })
  }

  const providerUrl = process.env.OP_PROVIDER
  const lootBoxPk = process.env.LOOT_BOX_PK
  const addressMin = parseFloat(process.env.ADDRESS_MIN)

  const eas = new EAS(providerUrl, lootBoxPk)

  let hash = null
  try {
    const balance = parseFloat(await eas.getBalance(address))
    if (balance >= addressMin) {
      return res(200)({ info: `Address has sufficient balance: ${balance}` })
    }
    hash = await eas.fundAddress(address, amount)
  } catch (error) {
    return res(500)({ error: error.message })
  }

  return res(200)({ info: `Funded address with ${amount}.` })
}

export const handler = async (event) => {
  const http = event.requestContext.http

  if (http.method === 'GET' && http.path === '/ping') {
    return {
      statusCode: 200,
      body: 'pong',
    }
  }

  if (http.method === 'GET' && http.path === '/get-balance') {
    return await get_balance(event.queryStringParameters)
  }

  if (http.method === 'GET' && http.path === '/fund-address') {
    return await fund_address(event.queryStringParameters)
  }

  if (http.method === 'POST' && http.path === '/attest') {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    return await attest(body)
  }

  return res(400)({ error: `Unknown path: ${http.path}` })
}
