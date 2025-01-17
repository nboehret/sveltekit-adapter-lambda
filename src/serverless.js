import { Server } from '../index.js';
import { manifest } from '../manifest.js';

export async function handler(event) {
  const app = new Server(manifest);
  const { rawPath, headers, rawQueryString, body, requestContext, isBase64Encoded, cookies } = event;

  const encoding = isBase64Encoded ? 'base64' : headers['content-encoding'] || 'utf-8';
  const rawBody = typeof body === 'string' ? Buffer.from(body, encoding) : body;

  if(cookies){
    headers['cookie'] = cookies.join('; ')
  }
  
  let rawURL = `https://${requestContext.domainName}${rawPath}${rawQueryString ? `?${rawQueryString}` : ''}`

  //Render the app
  const rendered = await app.respond(new Request(rawURL, {
    method: requestContext.http.method,
    headers: new Headers(headers),
    body: rawBody,
  }));

  //Parse the response into lambda proxy response
  if (rendered) {
    const resp = {
      headers: {},
      multiValueHeaders: {},
      body: await rendered.text(),
      statusCode: rendered.status
    }
    for (let k of rendered.headers.keys()) {
      let header = rendered.headers.get(k)

      //For multivalue headers, join them
      if (header instanceof Array) {
        header = header.join(',')
      }
      resp.headers[k] = header
    }
    return resp
  }
  return {
    statusCode: 404,
    body: 'Not found.'
  }
}
