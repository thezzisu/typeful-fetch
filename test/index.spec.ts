/* eslint-disable @typescript-eslint/no-explicit-any */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
  createClient,
  HandlerDescriptor,
  RouterDescriptor
} from '../src/index.js'

chai.use(chaiAsPromised)
const expect = chai.expect

function createFaker(logs: string[], path: string): any {
  logs.push(path)
  return new Proxy(() => 0, {
    get(_, prop) {
      if (prop === '!fackerPath') return path
      if (prop === 'then') return undefined
      return createFaker(
        logs,
        `${path}.${typeof prop === 'string' ? prop : String(prop)}`
      )
    },
    apply(_, thisArg, args) {
      return createFaker(
        logs,
        `${path}(${args.map((_) => JSON.stringify(_)).join(', ')})`
      )
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _fetch = globalThis.fetch

describe('client', () => {
  it('simple get', async () => {
    const logs: string[] = []
    globalThis.fetch = createFaker(logs, 'fetch')
    type Descriptor = RouterDescriptor<{
      '/': {
        GET: HandlerDescriptor<{
          querystring: {
            aaa: string
          }
          response: {
            200: {
              bbb: string
            }
          }
        }>
      }
    }>
    const client = createClient<Descriptor>('/')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result: Promise<{
      bbb: string
    }> = client.$get.query({ aaa: '123' }).fetch()
    await result
    expect(logs).to.include(
      `fetch("/?aaa=123", {"method":"GET","headers":{},"body":null})`
    )
  })
  it('simple post', async () => {
    const logs: string[] = []
    globalThis.fetch = createFaker(logs, 'fetch')
    type Descriptor = RouterDescriptor<{
      '/': {
        POST: HandlerDescriptor<{
          querystring: {
            aaa: string
          }
          body: {
            ping: number
          }
          headers: {
            'X-ZZS': string
          }
          response: {
            200: {
              bbb: string
            }
          }
        }>
      }
    }>
    const client = createClient<Descriptor>('/')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result: Promise<{
      bbb: string
    }> = client.$post
      .query({ aaa: '123' })
      .body({ ping: 111 })
      .headers({ 'X-ZZS': 'zzs' })
      .fetch()
    await result
    expect(logs).to.include(
      `fetch("/?aaa=123", {"method":"POST","headers":{"Content-Type":"application/json","X-ZZS":"zzs"},"body":"{\\"ping\\":111}"})`
    )
  })
  it('unsafe client', async () => {
    const logs: string[] = []
    globalThis.fetch = createFaker(logs, 'fetch')
    const client = createClient('/').$unsafe
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result: Promise<unknown> = client.$get.query({ aaa: '123' }).fetch()
    await result
    expect(logs).to.include(
      `fetch("/?aaa=123", {"method":"GET","headers":{},"body":null})`
    )
  })
})
