# Typeful Fetch

[![npm](https://img.shields.io/npm/v/typeful-fetch?style=flat-square)](https://www.npmjs.com/package/typeful-fetch)

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

More examples could be found in the unit tests.

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

**Parameters:**

- `path`: the base path of the client
- `options`: the default options of the client, which'll be deep merged into every fetch request

**Returns:**

A client with type support, which have the intuitive structure corresponding to the given `RouterDescriptor`.

Generally speaking, you will have to use `client.some.path.to.the.api.$method` to get a `ClientHandler`, using which you could form the actual fetch request. The expression given above will be mapped into an URL `${path}/some/path/to/the/api` and a method `method`, which is saved in the `ClientHandler` that you got.

Also, you could use `client.$unsafe` to get a client with identical path and options, but have type checking turned off. Use this if you want to use the client to fetch endpoints that are not described by the `RouterDescriptor`.

#### ClientHandler

Methods:

- `body`: set the body of the request
- `query`: set the querystring of the request
- `params`: set the params of the request
- `headers`: set the headers of the request
- `fetch`: form and fire the actual fetch request

Notice that `query` is serialized using the `qs` package, and `params` are implemented by simple doing string replacement stuff. **Pay attention when using these two methods**.

Please refer to the code for more details.
