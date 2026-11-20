import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { detailFrom, historyFrom, pendingFrom, sessionFrom } from '../data/adapter.js'
import { API_URL, REQUEST_TIMEOUT_MS } from '../lib/api.js'
import { selectToken, sessionCleared } from './authSlice.js'

/* Every call the web app makes to the hub backend, as RTK Query endpoints.

   RTK Query keeps the answers in the Redux store, shares one request between
   every screen that needs it, and refetches a list when something that
   changes it has happened (the `tags` below).

   Errors always come out in one shape: { status, message, data }
     status 0 = the server was never reached. `message` is fit to show. */

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  prepareHeaders: (headers, { getState }) => {
    const token = selectToken(getState())
    if (token) headers.set('Authorization', `Bearer ${token}`)
    headers.set('Accept', 'application/json')
    return headers
  },
})

// Signing in with wrong details is a 401 that must not sign anyone out
const NO_SIGN_OUT = ['login']

const baseQuery = async (args, ctx, extra) => {
  const hadToken = !!selectToken(ctx.getState())
  const result = await rawBaseQuery(args, ctx, extra)
  if (!result.error) return result

  const { status, originalStatus, data } = result.error
  const code = typeof status === 'number' ? status : originalStatus || 0
  if (!code) {
    return {
      error: {
        status: 0,
        message: 'Could not reach the server. Check your connection and try again.',
        data: {},
      },
    }
  }
  // The server no longer accepts the token: back to the login page
  if (code === 401 && hadToken && !NO_SIGN_OUT.includes(ctx.endpoint)) {
    ctx.dispatch(sessionCleared())
  }
  return {
    error: {
      status: code,
      message: (data && data.message) || 'Something went wrong. Please try again.',
      data: data && typeof data === 'object' ? data : {},
    },
  }
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Pending', 'History'],
  endpoints: (build) => ({
    /* ---- account ---- */
    login: build.mutation({
      query: ({ email, password }) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: { email, password },
      }),
      transformResponse: (data) => sessionFrom(data.token, data.user),
    }),
    // Confirms a saved token is still good; answers with the current user
    me: build.query({
      query: () => '/api/auth/me',
      transformResponse: (data) => data.user,
    }),
    // Being signed in is enough: only the new password is sent
    changePassword: build.mutation({
      query: (next) => ({
        url: '/api/auth/change-password',
        method: 'POST',
        body: { next },
      }),
      transformResponse: (data) => sessionFrom(data.token, data.user),
    }),

    /* ---- approvals ---- */
    // What is waiting in one software: { total, stages: { key: { count, items } } }
    getPending: build.query({
      query: (swId) => `/api/software/${swId}/pending`,
      transformResponse: (data, meta, swId) => pendingFrom(swId, data),
      providesTags: (result, error, swId) => [{ type: 'Pending', id: swId }],
    }),
    // One item in full, with the documents attached to it
    getItem: build.query({
      query: ({ swId, id }) => `/api/software/${swId}/items/${encodeURIComponent(id)}`,
      transformResponse: (data, meta, { swId }) => detailFrom(swId, data),
      // Opened fresh each time: the documents list is read live from the source
      keepUnusedDataFor: 0,
    }),
    // A link that opens one attached document; it works for two minutes
    createFileLink: build.mutation({
      query: ({ swId, id, docId }) => ({
        url: `/api/software/${swId}/items/${encodeURIComponent(id)}/files/${encodeURIComponent(docId)}/link`,
        method: 'POST',
        body: {},
      }),
      transformResponse: (data) => data.url,
    }),
    // verb: 'approve' | 'sendback' | 'reject'. Status 409 = already moved.
    decide: build.mutation({
      query: ({ swId, item, verb, reason }) => ({
        url: `/api/software/${swId}/items/${encodeURIComponent(item.id)}/${verb}`,
        method: 'POST',
        body: { stage: item.stage, reason: reason || undefined },
      }),
      // Refetch whether it worked or not: a refusal means the list is stale
      invalidatesTags: (result, error, { swId }) => [{ type: 'Pending', id: swId }, 'History'],
    }),
    // Approve everything in one stage: { moved: [ids], skipped: [ids] }
    approveAll: build.mutation({
      query: ({ swId, stage }) => ({
        url: `/api/software/${swId}/stages/${stage}/approve-all`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (result, error, { swId }) => [{ type: 'Pending', id: swId }, 'History'],
    }),
    // The CMD's saved decisions, newest first
    getHistory: build.query({
      query: () => '/api/decisions?limit=200',
      transformResponse: historyFrom,
      providesTags: ['History'],
    }),

    /* ---- browser push ---- */
    // The server's public push key, or null when push is not set up there
    getWebPushKey: build.query({
      query: () => '/api/devices/web-push-key',
      transformResponse: (data) => data.publicKey || null,
    }),
    // `subscription` is the browser's PushSubscription as JSON. `reminders` is
    // this browser's "reminder every 15 minutes" switch; when it is false the
    // server does not send the reminder here
    registerDevice: build.mutation({
      query: ({ subscription, reminders }) => ({
        url: '/api/devices',
        method: 'POST',
        body: { platform: 'web', subscription, reminders },
      }),
    }),
    unregisterDevice: build.mutation({
      query: (token) => ({
        url: '/api/devices',
        method: 'DELETE',
        body: { token },
      }),
    }),
  }),
})

// Hooks for components that load their own data
export const { useGetItemQuery, useCreateFileLinkMutation } = api

/** Turns an RTK Query error into an Error the screens can show:
    `.message` to display, `.status` to branch on (409 = already moved). */
export function toError(error) {
  const shown = new Error((error && error.message) || 'Something went wrong. Please try again.')
  shown.status = error && typeof error.status === 'number' ? error.status : 0
  shown.data = (error && error.data) || {}
  return shown
}
