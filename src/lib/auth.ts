// ================================================
// Client Authentication Fetch Helper
// ================================================

export function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('token') || '') : ''
  const opts = options || {}
  const headers = {
    ...(opts.headers || {}),
    'Authorization': 'Bearer ' + token,
  }

  return fetch(url, { ...opts, headers }).then((res) => {
    if (res.status === 401) {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear()
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return res
  })
}
