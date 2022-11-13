import qs from 'qs'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Is<S, T> = S extends T ? (T extends S ? true : false) : false
type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never
type UndefinedToUnknown<T> = Is<T, undefined> extends true ? unknown : T

function deepAssign(target: any, ...sources: any[]): any {
  for (const source of sources) {
    for (const key in source) {
      const targetValue = target[key]
      const sourceValue = source[key]

      if (targetValue && typeof targetValue === 'object') {
        deepAssign(targetValue, sourceValue)
      } else {
        target[key] = sourceValue
      }
    }
  }

  return target
}

export interface EndpointSchema<
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

export interface HandlerDescriptor<
  Schema extends EndpointSchema<any, any, any, any, any>
> {
  schema: Schema
}

type Route = RouterDescriptor<any> | Record<string, HandlerDescriptor<any>>

export interface RouterDescriptor<Routes extends Record<string, Route>> {
  routes: Routes
}

export class HandlerFetchError extends Error {
  constructor(public response: Response) {
    super(response.statusText)
  }
}

export class ClientHandler<H extends HandlerDescriptor<any>> {
  constructor(
    public _options: RequestInit,
    public _path: string,
    public _method: string,
    public _info: H['schema']
  ) {}

  body(body: UndefinedToUnknown<H['schema']['body']>): ClientHandler<H> {
    return new ClientHandler(
      this._options,
      this._path,
      this._method,
      Object.assign({}, this._info, { body })
    )
  }

  query(
    query: UndefinedToUnknown<H['schema']['querystring']>
  ): ClientHandler<H> {
    return new ClientHandler(
      this._options,
      this._path,
      this._method,
      Object.assign({}, this._info, { query })
    )
  }

  params(params: UndefinedToUnknown<H['schema']['params']>): ClientHandler<H> {
    return new ClientHandler(
      this._options,
      this._path,
      this._method,
      Object.assign({}, this._info, { params })
    )
  }

  headers(
    headers: UndefinedToUnknown<H['schema']['headers']>
  ): ClientHandler<H> {
    return new ClientHandler(
      this._options,
      this._path,
      this._method,
      Object.assign({}, this._info, { headers })
    )
  }

  async fetch(
    options: RequestInit = {}
  ): Promise<UndefinedToUnknown<H['schema']['response'][200]>> {
    let path = this._path
    if (!path.endsWith('/')) path += '/'
    for (const key in this._info.params) {
      const value = this._info.params[key]
      path = path.replace(
        `/:${key}/`,
        `/${String(value).replaceAll('$', '$$$$')}/`
      )
    }
    const query = qs.stringify(this._info.query)
    if (query) path += `?${query}`
    const resp = await fetch(
      path,
      deepAssign(
        {},
        this._options,
        {
          method: this._method,
          headers: {
            ...(this._method === 'GET'
              ? {}
              : { 'Content-Type': 'application/json' }),
            ...(this._info.headers ?? {})
          },
          body: this._method === 'GET' ? null : JSON.stringify(this._info.body)
        },
        options
      )
    )
    if (!resp.ok) throw new HandlerFetchError(resp)
    return resp.json()
  }
}

type RemovePrefixSlash<S> = S extends `/${infer T}` ? T : S
type NoEmpty<S> = S extends '' ? never : S

type InferClientSub<
  R extends RouterDescriptor<any>,
  K
> = K extends keyof R['routes']
  ? R['routes'][K] extends RouterDescriptor<any>
    ? InferClient<R['routes'][K]>
    : {
        [M in keyof R['routes'][K] as M extends string | number
          ? `$${Lowercase<`${M}`>}`
          : never]: ClientHandler<R['routes'][K][M]>
      }
  : // eslint-disable-next-line @typescript-eslint/ban-types
    {}

type InferClient<R extends RouterDescriptor<any>> = Id<
  {
    [K in keyof R['routes'] as NoEmpty<RemovePrefixSlash<K>>]: InferClientSub<
      R,
      K
    >
  } & InferClientSub<R, ''> &
    InferClientSub<R, '/'> & {
      $unsafe: UnsafeClient
    }
>

type WellKnownMethods =
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'PATCH'
  | 'POST'
  | 'PUT'
  | 'OPTIONS'
  | 'PROPFIND'
  | 'PROPPATCH'
  | 'MKCOL'
  | 'COPY'
  | 'MOVE'
  | 'LOCK'
  | 'UNLOCK'
  | 'TRACE'
  | 'SEARCH'
type UnsafeClient = {
  [M in WellKnownMethods as `$${Lowercase<M>}`]: ClientHandler<
    HandlerDescriptor<
      EndpointSchema<
        unknown,
        unknown,
        unknown,
        unknown,
        Record<number, unknown>
      >
    >
  >
} & {
  [K: string]: UnsafeClient
}

function join(L: string, R: string) {
  L = L.endsWith('/') ? L.slice(0, -1) : L
  R = R.startsWith('/') ? R.slice(1) : R
  return L + '/' + R
}

export function createClient<
  // eslint-disable-next-line @typescript-eslint/ban-types
  R extends RouterDescriptor<any> = RouterDescriptor<{}>
>(path: string, options: RequestInit = {}): InferClient<R> {
  return <any>new Proxy(
    {},
    {
      get(_, prop) {
        if (typeof prop !== 'string')
          throw new Error('Only string props are allowed')
        if (prop === '$unsafe') return createClient(path, options)
        if (prop.startsWith('$'))
          return new ClientHandler(
            options,
            path,
            prop.substring(1).toUpperCase(),
            {}
          )
        return createClient(join(path, prop), options)
      }
    }
  )
}
