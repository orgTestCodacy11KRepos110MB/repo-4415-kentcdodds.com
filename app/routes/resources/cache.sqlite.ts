import type {DataFunctionArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {getInstanceInfo} from 'server/fly'
import {cache} from '~/utils/cache.server'
import {getInternalInstanceDomain} from '~/utils/fly.server'
import {getRequiredServerEnvVar} from '~/utils/misc'

export async function action({request}: DataFunctionArgs) {
  const {currentIsPrimary, primaryInstance} = getInstanceInfo()
  if (!currentIsPrimary) {
    throw new Error(
      `${request.url} should only be called on the primary instance (${primaryInstance})}`,
    )
  }
  const token = getRequiredServerEnvVar('INTERNAL_COMMAND_TOKEN')
  const isAuthorized =
    request.headers.get('Authorization') === `Bearer ${token}`
  if (!isAuthorized) {
    // rick roll them
    return redirect('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  }
  const {key, cacheValue} = await request.json()
  if (cacheValue === undefined) {
    await cache.delete(key)
  } else {
    await cache.set(key, cacheValue)
  }
  return json({success: true})
}

export async function updatePrimaryCacheValue({
  key,
  cacheValue,
}: {
  key: string
  cacheValue: any
}) {
  const {currentIsPrimary, primaryInstance} = getInstanceInfo()
  if (currentIsPrimary) {
    throw new Error(
      `updatePrimaryCacheValue should not be called on the primary instance (${primaryInstance})}`,
    )
  }
  const domain = getInternalInstanceDomain(primaryInstance)
  const token = getRequiredServerEnvVar('INTERNAL_COMMAND_TOKEN')
  return fetch(`${domain}/resources/cache/sqlite`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({key, cacheValue}),
  })
}
