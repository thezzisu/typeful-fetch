# Typeful Fetch

A fetch builder with type support

## Usage

First, you'll need to define some **Descriptors** to describe your fetch endpoints. Then just call `createClient` with your descriptors and you're good to go! See [examples](#examples) below.

See [references](#references) for more details.

## Examples

```ts
import {
  createClient,
  RouterDescriptor,
  HandlerDescriptor
} from 'typeful-fetch'

type D = RouterDescriptor<{
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
    POST: HandlerDescriptor<{
      body: {
        ccc: string
      }
      response: {
        200: {
          ddd: string
        }
      }
    }>
  }
  '/misc': RouterDescriptor<{
    '/': {
      PUT: HandlerDescriptor<{
        body: {
          eee: string
        }
        response: {
          200: {
            fff: string
          }
        }
      }>
    }
    '/hello': {
      GET: HandlerDescriptor<{
        response: {
          200: {
            ggg: string
          }
        }
      }>
    }
  }>
}>

const client = createClient<D>('http://localhost:3000/')
client.$get.query({ aaa: '123' }).fetch() // Promise<{ bbb: string; }>
client.$post.body({ ccc: '456' }).fetch() // Promise<{ ddd: string; }>
client.misc.$put.body({ eee: '789' }).fetch() // Promise<{ fff: string; }>
client.misc.hello.$get.fetch() // Promise<{ ggg: string; }>
```

## References

### Descriptors

Descriptors are used to describe your fetch endpoints. They are used to generate a client with type support.

We only have two types of descriptors: `RouterDescriptor` and `HandlerDescriptor`.

#### RouterDescriptor

```ts
type Route = RouterDescriptor<any> | Record<string, HandlerDescriptor<any>>
interface RouterDescriptor<Routes extends Record<string, Route>> {...}
```

RouterDescriptor is used to describe a router. It takes a generic type `Routes` which is a record of routes. Each route can be either a `RouterDescriptor` or a record of method to `HandlerDescriptor`.

Also, route with a prefix `/` will have that prefix removed. Thus, the following two descriptors are equivalent:

```ts
type D1 = RouterDescriptor<{
  '/hello': {
    GET: HandlerDescriptor<{ response: { 200: { a: string } } }>
  }
}>
type D2 = RouterDescriptor<{
  hello: {
    GET: HandlerDescriptor<{ response: { 200: { a: string } } }>
  }
}>
```

But we recommend using the first one, because it's more explicit.

Notice that we have special handling for the `/` route. It is used to describe the root route of a router. If exists, it should be a record of method to `HandlerDescriptor`. Otherwise, the type inference is not promised to succeed.

#### HandlerDescriptor

```ts
interface EndpointSchema<
  Body,
  Query,
  Params,
  Headers,
  Response extends Record<number, any>
> {
  body?: Body
  querystring?: Query
  params?: Params
  headers?: Headers
  response?: Response
}

interface HandlerDescriptor<Schema extends EndpointSchema<any, any, any, any, any>> {...}
```

HandlerDescriptor is used to describe a handler. Please notice that handlers have nothing to do with the path and method; they are just used to describe the schema of the endpoint.

To have the generated `fetch` return a promise with the correct type, you need to specify the `response` field in the schema. The key of the `response` field should be the status code of the response, and the value should be the type of the response body. Thus, you should at least specify the `response.200` field.

### API

#### createClient

```ts
function createClient<R extends RouterDescriptor<any>>(
  path: string,
  options: RequestInit = {}
)
```

`createClient` takes a `RouterDescriptor` as generic parameter and returns a client with type support.

Parameters:

- `path`: the base path of the client
- `options`: the default options of the client, which'll be deep merged into every fetch request
